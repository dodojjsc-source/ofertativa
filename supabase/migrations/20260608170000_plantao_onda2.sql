-- =====================================================
-- ONDA 2 (follow-up): segunda mensagem do plantao de oferta ativa
-- =====================================================
-- Modela follow-up sem duplicar linhas: cada disparo_fila ganha campos msg2_*
-- e cada copy ganha "fase" (1 ou 2). Elegibilidade automatica via cron 8h BRT.

-- 1. Coluna fase nos copies (1 = primeira msg, 2 = follow-up)
ALTER TABLE public.disparo_copies
  ADD COLUMN IF NOT EXISTS fase SMALLINT NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.disparo_copies ADD CONSTRAINT disparo_copies_fase_check CHECK (fase IN (1, 2));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_copies_plantao_fase
  ON public.disparo_copies(plantao_id, fase, ativa)
  WHERE ativa = true;

-- 2. Colunas msg2 em disparo_fila (reusa enum abordagem_manual_status)
ALTER TABLE public.disparo_fila
  ADD COLUMN IF NOT EXISTS msg2_copy_id UUID REFERENCES public.disparo_copies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS msg2_status public.abordagem_manual_status,
  ADD COLUMN IF NOT EXISTS msg2_texto TEXT,
  ADD COLUMN IF NOT EXISTS msg2_complemento TEXT,
  ADD COLUMN IF NOT EXISTS msg2_aberto_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS msg2_confirmado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS msg2_motivo_nao_envio TEXT,
  ADD COLUMN IF NOT EXISTS msg2_print_url TEXT,
  ADD COLUMN IF NOT EXISTS msg2_pronto_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fila_msg2_pendente
  ON public.disparo_fila(plantao_id, corretor_id)
  WHERE msg2_pronto_em IS NOT NULL AND msg2_confirmado_em IS NULL;

-- 3. RPC: cron elege leads pra Onda 2 (msg1 enviada >= 48h, sem resposta, sem msg2 ainda)
CREATE OR REPLACE FUNCTION public.marcar_pronto_onda2()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE public.disparo_fila f
  SET msg2_pronto_em = now(),
      msg2_status = 'pendente'::abordagem_manual_status,
      updated_at = now()
  WHERE f.abordagem_status = 'enviou'
    AND f.msg2_status IS NULL
    AND f.enviado_em IS NOT NULL
    AND f.enviado_em < now() - INTERVAL '48 hours'
    AND f.corretor_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.disparo_respostas r WHERE r.fila_id = f.id
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- 4. RPC: corretor abre WA pra Onda 2 (manual trigger antes do cron)
CREATE OR REPLACE FUNCTION public.abordagem_abrir_wa_msg2(_fila_id UUID, _copy_id UUID, _texto TEXT, _complemento TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ok BOOLEAN := FALSE;
BEGIN
  UPDATE public.disparo_fila
  SET msg2_copy_id = _copy_id,
      msg2_texto = _texto,
      msg2_complemento = _complemento,
      msg2_status = 'abriu_wa'::abordagem_manual_status,
      msg2_aberto_em = now(),
      msg2_pronto_em = COALESCE(msg2_pronto_em, now()),
      updated_at = now()
  WHERE id = _fila_id
    AND corretor_id = auth.uid()
    AND abordagem_status = 'enviou'
  RETURNING TRUE INTO _ok;
  RETURN COALESCE(_ok, FALSE);
END;
$$;

-- 5. RPC: confirmar envio (ou nao envio) da Onda 2
CREATE OR REPLACE FUNCTION public.abordagem_confirmar_msg2(
  _fila_id UUID,
  _enviou BOOLEAN,
  _motivo TEXT DEFAULT NULL,
  _print_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ok BOOLEAN := FALSE;
BEGIN
  UPDATE public.disparo_fila
  SET msg2_status = CASE WHEN _enviou THEN 'enviou'::abordagem_manual_status ELSE 'nao_enviou'::abordagem_manual_status END,
      msg2_confirmado_em = now(),
      msg2_motivo_nao_envio = CASE WHEN _enviou THEN NULL ELSE _motivo END,
      msg2_print_url = COALESCE(_print_url, msg2_print_url),
      updated_at = now()
  WHERE id = _fila_id
    AND corretor_id = auth.uid()
  RETURNING TRUE INTO _ok;

  IF _ok AND _enviou THEN
    UPDATE public.disparo_copies SET vezes_usada = vezes_usada + 1
    WHERE id = (SELECT msg2_copy_id FROM public.disparo_fila WHERE id = _fila_id);
  END IF;

  RETURN COALESCE(_ok, FALSE);
END;
$$;

-- 6. Cron diario 8h BRT (11h UTC) -> marcar leads elegiveis pra Onda 2
-- Idempotente: remove agendamento previo se existir, e so agenda se pg_cron disponivel
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('plantao-onda2-elegibilidade');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'plantao-onda2-elegibilidade',
      '0 11 * * *',
      $job$ SELECT public.marcar_pronto_onda2(); $job$
    );
  ELSE
    RAISE NOTICE 'pg_cron nao instalado. Rode SELECT public.marcar_pronto_onda2() manualmente ou configure agendamento externo.';
  END IF;
END $$;

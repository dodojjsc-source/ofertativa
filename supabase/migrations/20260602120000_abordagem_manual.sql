-- =====================================================
-- ABORDAGEM MANUAL: corretor envia do WhatsApp Web dele
-- =====================================================
-- Aproveita disparo_plantoes/disparo_fila adicionando:
--   - modo do plantão ('automatico' | 'manual')
--   - atribuição do lead da fila a um corretor
--   - status da abordagem manual + texto enviado + print sintético
--   - RLS pra corretor ver/atualizar SÓ os leads atribuídos a ele

-- 1. Enum + coluna de modo no plantão
DO $$ BEGIN
  CREATE TYPE public.plantao_modo AS ENUM ('automatico', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.disparo_plantoes
  ADD COLUMN IF NOT EXISTS modo public.plantao_modo NOT NULL DEFAULT 'automatico';

-- 2. Enum status abordagem manual
DO $$ BEGIN
  CREATE TYPE public.abordagem_manual_status AS ENUM (
    'pendente',       -- ainda não foi aberta no WA
    'abriu_wa',       -- clicou no botão, abriu wa.me, aguardando confirmar
    'enviou',         -- corretor confirmou que mandou
    'nao_enviou',     -- corretor confirmou que NÃO mandou (motivo)
    'respondida'      -- cliente respondeu (futuro: cruzar com Bitrix)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Colunas em disparo_fila pra modo manual
ALTER TABLE public.disparo_fila
  ADD COLUMN IF NOT EXISTS corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS abordagem_status public.abordagem_manual_status,
  ADD COLUMN IF NOT EXISTS texto_enviado TEXT,
  ADD COLUMN IF NOT EXISTS complemento_livre TEXT,
  ADD COLUMN IF NOT EXISTS abordagem_aberto_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS abordagem_confirmado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS abordagem_motivo_nao_envio TEXT,
  ADD COLUMN IF NOT EXISTS print_url TEXT;

CREATE INDEX IF NOT EXISTS idx_fila_corretor_status
  ON public.disparo_fila(corretor_id, abordagem_status)
  WHERE corretor_id IS NOT NULL;

-- 4. RLS pra corretor ver SEUS leads da fila (modo manual)
DROP POLICY IF EXISTS "Corretor ve sua fila manual" ON public.disparo_fila;
CREATE POLICY "Corretor ve sua fila manual" ON public.disparo_fila
  FOR SELECT USING (
    public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid()
  );

DROP POLICY IF EXISTS "Corretor atualiza sua fila manual" ON public.disparo_fila;
CREATE POLICY "Corretor atualiza sua fila manual" ON public.disparo_fila
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid()
  );

-- Corretor precisa ler plantão e copies do plantão que ele tem lead atribuído
DROP POLICY IF EXISTS "Corretor le plantao manual" ON public.disparo_plantoes;
CREATE POLICY "Corretor le plantao manual" ON public.disparo_plantoes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'corretor') AND modo = 'manual' AND EXISTS (
      SELECT 1 FROM public.disparo_fila f
      WHERE f.plantao_id = disparo_plantoes.id AND f.corretor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Corretor le copies manual" ON public.disparo_copies;
CREATE POLICY "Corretor le copies manual" ON public.disparo_copies
  FOR SELECT USING (
    public.has_role(auth.uid(), 'corretor') AND EXISTS (
      SELECT 1 FROM public.disparo_fila f
      WHERE f.plantao_id = disparo_copies.plantao_id AND f.corretor_id = auth.uid()
    )
  );

-- Gestor ve fila/plantao da equipe
DROP POLICY IF EXISTS "Gestor le plantao manual" ON public.disparo_plantoes;
CREATE POLICY "Gestor le plantao manual" ON public.disparo_plantoes
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gestor') AND modo = 'manual'
  );

DROP POLICY IF EXISTS "Gestor le copies manual" ON public.disparo_copies;
CREATE POLICY "Gestor le copies manual" ON public.disparo_copies
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gestor')
  );

DROP POLICY IF EXISTS "Gestor le fila manual" ON public.disparo_fila;
CREATE POLICY "Gestor le fila manual" ON public.disparo_fila
  FOR SELECT USING (
    public.has_role(auth.uid(), 'gestor') AND corretor_id IN (
      SELECT id FROM public.profiles WHERE gestor_id = auth.uid()
    )
  );

-- 5. RPC pra corretor marcar "abriu WA" (intenção registrada)
CREATE OR REPLACE FUNCTION public.abordagem_abrir_wa(_fila_id UUID, _copy_id UUID, _texto TEXT, _complemento TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _ok BOOLEAN := FALSE;
BEGIN
  UPDATE public.disparo_fila
  SET copy_id = _copy_id,
      texto_enviado = _texto,
      complemento_livre = _complemento,
      abordagem_status = 'abriu_wa',
      abordagem_aberto_em = now(),
      updated_at = now()
  WHERE id = _fila_id
    AND corretor_id = auth.uid()
  RETURNING TRUE INTO _ok;
  RETURN COALESCE(_ok, FALSE);
END;
$$;

-- 6. RPC pra confirmar envio (ou não envio)
CREATE OR REPLACE FUNCTION public.abordagem_confirmar(
  _fila_id UUID,
  _enviou BOOLEAN,
  _motivo TEXT DEFAULT NULL,
  _print_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _ok BOOLEAN := FALSE;
BEGIN
  UPDATE public.disparo_fila
  SET abordagem_status = CASE WHEN _enviou THEN 'enviou'::abordagem_manual_status ELSE 'nao_enviou'::abordagem_manual_status END,
      abordagem_confirmado_em = now(),
      abordagem_motivo_nao_envio = CASE WHEN _enviou THEN NULL ELSE _motivo END,
      print_url = COALESCE(_print_url, print_url),
      status = CASE WHEN _enviou THEN 'enviado'::disparo_fila_status ELSE status END,
      enviado_em = CASE WHEN _enviou THEN now() ELSE enviado_em END,
      updated_at = now()
  WHERE id = _fila_id
    AND corretor_id = auth.uid()
  RETURNING TRUE INTO _ok;

  IF _ok AND _enviou THEN
    UPDATE public.disparo_copies SET vezes_usada = vezes_usada + 1
    WHERE id = (SELECT copy_id FROM public.disparo_fila WHERE id = _fila_id);
  END IF;

  RETURN COALESCE(_ok, FALSE);
END;
$$;

-- 7. Storage bucket pros prints sintéticos
INSERT INTO storage.buckets (id, name, public)
VALUES ('abordagens', 'abordagens', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Abordagens upload corretor" ON storage.objects;
CREATE POLICY "Abordagens upload corretor" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'abordagens');

DROP POLICY IF EXISTS "Abordagens leitura publica" ON storage.objects;
CREATE POLICY "Abordagens leitura publica" ON storage.objects
  FOR SELECT USING (bucket_id = 'abordagens');

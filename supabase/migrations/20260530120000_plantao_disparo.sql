-- =====================================================
-- MÓDULO PLANTÃO: Disparo ativo de oferta via WhatsApp
-- =====================================================
-- Independente do fluxo manual (campanhas + atendimento).
-- Worker externo (VPS) consome filas via service_role.

-- Enums
CREATE TYPE public.plantao_status AS ENUM ('rascunho', 'aprovado', 'ativo', 'pausado', 'concluido', 'cancelado');
CREATE TYPE public.disparo_fila_status AS ENUM ('aguardando', 'enviado', 'falhou', 'optout_pre', 'cancelado');
CREATE TYPE public.disparo_log_evento AS ENUM ('enviado', 'entregue', 'lido', 'falha');
CREATE TYPE public.resposta_classificacao AS ENUM ('interessado', 'frio', 'optout', 'outro', 'pendente');
CREATE TYPE public.handoff_status AS ENUM ('aguardando', 'em_atendimento', 'concluido', 'descartado');

-- =====================================================
-- 1. PLANTÕES (campanhas de disparo)
-- =====================================================
CREATE TABLE public.disparo_plantoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status plantao_status NOT NULL DEFAULT 'rascunho',

  -- Conteúdo da oferta
  eflyer_url TEXT,
  video_url TEXT,
  pilares JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Configuração de envio
  chip_instance TEXT NOT NULL,
  ritmo_min_seg INTEGER NOT NULL DEFAULT 60,
  ritmo_max_seg INTEGER NOT NULL DEFAULT 90,
  volume_max_dia INTEGER NOT NULL DEFAULT 80,
  janelas JSONB NOT NULL DEFAULT '[
    {"dia":"seg","inicio":"09:00","fim":"11:30"},
    {"dia":"seg","inicio":"14:00","fim":"17:30"},
    {"dia":"ter","inicio":"09:00","fim":"11:30"},
    {"dia":"ter","inicio":"14:00","fim":"17:30"},
    {"dia":"qua","inicio":"09:00","fim":"11:30"},
    {"dia":"qua","inicio":"14:00","fim":"17:30"},
    {"dia":"qui","inicio":"09:00","fim":"11:30"},
    {"dia":"qui","inicio":"14:00","fim":"17:30"},
    {"dia":"sex","inicio":"09:00","fim":"11:30"},
    {"dia":"sex","inicio":"14:00","fim":"17:30"},
    {"dia":"sab","inicio":"10:00","fim":"12:00"}
  ]'::jsonb,

  -- Handoff
  corretores_handoff UUID[] NOT NULL DEFAULT '{}',
  modo_handoff TEXT NOT NULL DEFAULT 'pull' CHECK (modo_handoff IN ('pull','round_robin')),
  bitrix_funil_id TEXT,

  -- Stats agregados (atualizados pelo worker)
  total_leads INTEGER NOT NULL DEFAULT 0,
  total_enviados INTEGER NOT NULL DEFAULT 0,
  total_entregues INTEGER NOT NULL DEFAULT 0,
  total_lidos INTEGER NOT NULL DEFAULT 0,
  total_respostas INTEGER NOT NULL DEFAULT 0,
  total_optout INTEGER NOT NULL DEFAULT 0,
  total_falhas INTEGER NOT NULL DEFAULT 0,

  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ,
  pausado_em TIMESTAMPTZ,

  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plantoes_status ON public.disparo_plantoes(status);
CREATE INDEX idx_plantoes_created_at ON public.disparo_plantoes(created_at DESC);

-- =====================================================
-- 2. COPIES (5+ variações por plantão)
-- =====================================================
CREATE TABLE public.disparo_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id UUID NOT NULL REFERENCES public.disparo_plantoes(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  texto TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  inclui_eflyer BOOLEAN NOT NULL DEFAULT TRUE,
  vezes_usada INTEGER NOT NULL DEFAULT 0,
  taxa_resposta NUMERIC(5,2),
  taxa_optout NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plantao_id, ordem)
);

CREATE INDEX idx_copies_plantao ON public.disparo_copies(plantao_id);

-- =====================================================
-- 3. FILA de disparo (cada lead = 1 linha)
-- =====================================================
CREATE TABLE public.disparo_fila (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id UUID NOT NULL REFERENCES public.disparo_plantoes(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  telefone_norm TEXT NOT NULL,
  email TEXT,
  origem TEXT,
  bitrix_lead_id TEXT,

  status disparo_fila_status NOT NULL DEFAULT 'aguardando',
  copy_id UUID REFERENCES public.disparo_copies(id) ON DELETE SET NULL,

  agendado_para TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  evolution_msg_id TEXT,
  motivo_falha TEXT,
  tentativas INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fila_plantao_status ON public.disparo_fila(plantao_id, status);
CREATE INDEX idx_fila_aguardando ON public.disparo_fila(plantao_id, agendado_para) WHERE status = 'aguardando';
CREATE INDEX idx_fila_telefone_norm ON public.disparo_fila(telefone_norm);
CREATE UNIQUE INDEX idx_fila_uniq_lead ON public.disparo_fila(plantao_id, telefone_norm);

-- =====================================================
-- 4. LOGS de eventos (entregue, lido, falha)
-- =====================================================
CREATE TABLE public.disparo_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id UUID NOT NULL REFERENCES public.disparo_plantoes(id) ON DELETE CASCADE,
  fila_id UUID REFERENCES public.disparo_fila(id) ON DELETE CASCADE,
  evento disparo_log_evento NOT NULL,
  evolution_msg_id TEXT,
  raw_payload JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_plantao_ts ON public.disparo_logs(plantao_id, timestamp DESC);
CREATE INDEX idx_logs_fila ON public.disparo_logs(fila_id);

-- =====================================================
-- 5. RESPOSTAS recebidas dos clientes
-- =====================================================
CREATE TABLE public.disparo_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id UUID NOT NULL REFERENCES public.disparo_plantoes(id) ON DELETE CASCADE,
  fila_id UUID REFERENCES public.disparo_fila(id) ON DELETE SET NULL,

  telefone TEXT NOT NULL,
  telefone_norm TEXT NOT NULL,
  nome TEXT,
  mensagem TEXT NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  classificacao resposta_classificacao NOT NULL DEFAULT 'pendente',
  classificacao_motivo TEXT,
  classificacao_score NUMERIC(4,3),
  classificacao_manual BOOLEAN NOT NULL DEFAULT FALSE,

  -- Handoff
  handoff_status handoff_status NOT NULL DEFAULT 'aguardando',
  pego_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pego_em TIMESTAMPTZ,
  travado_ate TIMESTAMPTZ,
  bitrix_lead_id TEXT,
  observacao TEXT,

  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_respostas_plantao ON public.disparo_respostas(plantao_id, recebido_em DESC);
CREATE INDEX idx_respostas_handoff ON public.disparo_respostas(plantao_id, handoff_status) WHERE handoff_status = 'aguardando';
CREATE INDEX idx_respostas_classificacao ON public.disparo_respostas(plantao_id, classificacao);
CREATE INDEX idx_respostas_telefone_norm ON public.disparo_respostas(telefone_norm);

-- =====================================================
-- 6. Triggers updated_at
-- =====================================================
CREATE TRIGGER trg_plantoes_updated
  BEFORE UPDATE ON public.disparo_plantoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_fila_updated
  BEFORE UPDATE ON public.disparo_fila
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_respostas_updated
  BEFORE UPDATE ON public.disparo_respostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. RLS: por enquanto SÓ ADMIN tudo
-- =====================================================
ALTER TABLE public.disparo_plantoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_fila ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin tudo plantoes" ON public.disparo_plantoes
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin tudo copies" ON public.disparo_copies
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin tudo fila" ON public.disparo_fila
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin tudo logs" ON public.disparo_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin tudo respostas" ON public.disparo_respostas
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Corretor handoff: pode ver e atualizar SUAS respostas em handoff
CREATE POLICY "Corretor ve respostas handoff dele" ON public.disparo_respostas
  FOR SELECT USING (
    public.has_role(auth.uid(), 'corretor') AND pego_por = auth.uid()
  );

CREATE POLICY "Corretor atualiza handoff dele" ON public.disparo_respostas
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'corretor') AND pego_por = auth.uid()
  );

-- =====================================================
-- 8. RPCs auxiliares
-- =====================================================

-- Normaliza telefone BR (só dígitos, 13 chars com 55+DDD+numero)
CREATE OR REPLACE FUNCTION public.norm_telefone_br(_tel TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  d TEXT;
BEGIN
  IF _tel IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(_tel, '[^0-9]', '', 'g');
  IF length(d) = 10 OR length(d) = 11 THEN d := '55' || d; END IF;
  IF length(d) = 12 THEN
    -- falta o 9, adiciona após o DDD
    d := substring(d, 1, 4) || '9' || substring(d, 5);
  END IF;
  RETURN d;
END;
$$;

-- Recalcula stats agregadas de um plantão
CREATE OR REPLACE FUNCTION public.recalc_plantao_stats(_plantao_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.disparo_plantoes p SET
    total_leads = (SELECT COUNT(*) FROM disparo_fila WHERE plantao_id = _plantao_id),
    total_enviados = (SELECT COUNT(*) FROM disparo_fila WHERE plantao_id = _plantao_id AND status = 'enviado'),
    total_entregues = (SELECT COUNT(DISTINCT fila_id) FROM disparo_logs WHERE plantao_id = _plantao_id AND evento = 'entregue'),
    total_lidos = (SELECT COUNT(DISTINCT fila_id) FROM disparo_logs WHERE plantao_id = _plantao_id AND evento = 'lido'),
    total_respostas = (SELECT COUNT(*) FROM disparo_respostas WHERE plantao_id = _plantao_id),
    total_optout = (SELECT COUNT(*) FROM disparo_respostas WHERE plantao_id = _plantao_id AND classificacao = 'optout'),
    total_falhas = (SELECT COUNT(*) FROM disparo_fila WHERE plantao_id = _plantao_id AND status = 'falhou'),
    updated_at = now()
  WHERE id = _plantao_id;
END;
$$;

-- Pega resposta da fila de handoff (pull-based atomic claim)
CREATE OR REPLACE FUNCTION public.handoff_pegar(_resposta_id UUID, _corretor_id UUID, _lock_min INTEGER DEFAULT 5)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ok BOOLEAN;
BEGIN
  UPDATE public.disparo_respostas
  SET handoff_status = 'em_atendimento',
      pego_por = _corretor_id,
      pego_em = now(),
      travado_ate = now() + (_lock_min || ' minutes')::interval,
      updated_at = now()
  WHERE id = _resposta_id
    AND (handoff_status = 'aguardando' OR (travado_ate IS NOT NULL AND travado_ate < now()))
  RETURNING TRUE INTO ok;
  RETURN COALESCE(ok, FALSE);
END;
$$;

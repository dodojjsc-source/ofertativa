-- Tabela para leads não atendidos após 3 tentativas
CREATE TABLE IF NOT EXISTS nao_atendidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_lead_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  observacao TEXT,
  tentativas_contato INTEGER NOT NULL DEFAULT 3,
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  flagged_by UUID,
  corretor_id UUID,
  gestor_id UUID,
  campanha_id UUID,
  campanha_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE nao_atendidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver não atendidos"
ON nao_atendidos FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir não atendidos"
ON nao_atendidos FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar não atendidos"
ON nao_atendidos FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar não atendidos"
ON nao_atendidos FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para performance
CREATE INDEX idx_nao_atendidos_campanha ON nao_atendidos(campanha_id);
CREATE INDEX idx_nao_atendidos_corretor ON nao_atendidos(corretor_id);
CREATE INDEX idx_nao_atendidos_flagged_at ON nao_atendidos(flagged_at DESC);

-- Adicionar 'nao_atendeu' ao enum feedback_type
ALTER TYPE feedback_type ADD VALUE IF NOT EXISTS 'nao_atendeu';
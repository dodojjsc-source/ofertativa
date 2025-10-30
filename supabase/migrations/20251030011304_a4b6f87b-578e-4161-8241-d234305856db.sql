-- Adicionar campos de normalização em todas as tabelas com telefones

-- Tabela LEADS
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS telefone_raw TEXT,
  ADD COLUMN IF NOT EXISTS ddi TEXT DEFAULT '55',
  ADD COLUMN IF NOT EXISTS ddd TEXT,
  ADD COLUMN IF NOT EXISTS numero_core TEXT,
  ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS e164 TEXT,
  ADD COLUMN IF NOT EXISTS display_local TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS validacao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_validacao TEXT;

-- Índices para busca por E.164 (deduplicação e integrações)
CREATE INDEX IF NOT EXISTS idx_leads_e164 ON leads(e164);
CREATE INDEX IF NOT EXISTS idx_leads_telefone_raw ON leads(telefone_raw);

-- Aplicar mesma estrutura nas outras tabelas
ALTER TABLE optout_contacts
  ADD COLUMN IF NOT EXISTS telefone_raw TEXT,
  ADD COLUMN IF NOT EXISTS ddi TEXT DEFAULT '55',
  ADD COLUMN IF NOT EXISTS ddd TEXT,
  ADD COLUMN IF NOT EXISTS numero_core TEXT,
  ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS e164 TEXT,
  ADD COLUMN IF NOT EXISTS display_local TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS validacao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_validacao TEXT;

CREATE INDEX IF NOT EXISTS idx_optout_e164 ON optout_contacts(e164);

ALTER TABLE contatos_errados
  ADD COLUMN IF NOT EXISTS telefone_raw TEXT,
  ADD COLUMN IF NOT EXISTS ddi TEXT DEFAULT '55',
  ADD COLUMN IF NOT EXISTS ddd TEXT,
  ADD COLUMN IF NOT EXISTS numero_core TEXT,
  ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS e164 TEXT,
  ADD COLUMN IF NOT EXISTS display_local TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS validacao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_validacao TEXT;

CREATE INDEX IF NOT EXISTS idx_contatos_errados_e164 ON contatos_errados(e164);

ALTER TABLE nao_atendidos
  ADD COLUMN IF NOT EXISTS telefone_raw TEXT,
  ADD COLUMN IF NOT EXISTS ddi TEXT DEFAULT '55',
  ADD COLUMN IF NOT EXISTS ddd TEXT,
  ADD COLUMN IF NOT EXISTS numero_core TEXT,
  ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS e164 TEXT,
  ADD COLUMN IF NOT EXISTS display_local TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS validacao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_validacao TEXT;

CREATE INDEX IF NOT EXISTS idx_nao_atendidos_e164 ON nao_atendidos(e164);

ALTER TABLE bitrix_queue
  ADD COLUMN IF NOT EXISTS telefone_raw TEXT,
  ADD COLUMN IF NOT EXISTS ddi TEXT DEFAULT '55',
  ADD COLUMN IF NOT EXISTS ddd TEXT,
  ADD COLUMN IF NOT EXISTS numero_core TEXT,
  ADD COLUMN IF NOT EXISTS is_mobile BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS e164 TEXT,
  ADD COLUMN IF NOT EXISTS display_local TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
  ADD COLUMN IF NOT EXISTS validacao TEXT DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS motivo_validacao TEXT;

CREATE INDEX IF NOT EXISTS idx_bitrix_queue_e164 ON bitrix_queue(e164);

-- Copiar telefone atual para telefone_raw (backfill inicial)
UPDATE leads SET telefone_raw = telefone WHERE telefone_raw IS NULL AND telefone IS NOT NULL;
UPDATE optout_contacts SET telefone_raw = telefone WHERE telefone_raw IS NULL AND telefone IS NOT NULL;
UPDATE contatos_errados SET telefone_raw = telefone WHERE telefone_raw IS NULL AND telefone IS NOT NULL;
UPDATE nao_atendidos SET telefone_raw = telefone WHERE telefone_raw IS NULL AND telefone IS NOT NULL;
UPDATE bitrix_queue SET telefone_raw = telefone WHERE telefone_raw IS NULL AND telefone IS NOT NULL;

-- Criar tabela de jobs para observabilidade
CREATE TABLE IF NOT EXISTS jobs_telefone_normalizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  total_processados INTEGER DEFAULT 0,
  ok INTEGER DEFAULT 0,
  incompleto INTEGER DEFAULT 0,
  invalido INTEGER DEFAULT 0,
  vazios INTEGER DEFAULT 0,
  executado_por UUID REFERENCES auth.users(id),
  parametros_json JSONB,
  amostra_issues_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: apenas admins podem ver/inserir jobs
ALTER TABLE jobs_telefone_normalizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver jobs" ON jobs_telefone_normalizacao
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir jobs" ON jobs_telefone_normalizacao
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
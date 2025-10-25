-- Adicionar coluna para rastrear tentativas de contato
ALTER TABLE leads 
ADD COLUMN tentativas_contato integer NOT NULL DEFAULT 0;

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_leads_tentativas 
ON leads(corretor_id, status, tentativas_contato);

-- Comentário explicativo
COMMENT ON COLUMN leads.tentativas_contato IS 'Número de tentativas de contato (máximo 3 antes de liberar para redistribuição)';
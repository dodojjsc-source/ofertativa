-- Adicionar foreign key na tabela leads para referenciar campanhas
ALTER TABLE leads 
ADD CONSTRAINT fk_leads_campanha 
FOREIGN KEY (campanha_id) 
REFERENCES campanhas(id) 
ON DELETE SET NULL;

-- Criar índice para melhorar performance das queries com join
CREATE INDEX IF NOT EXISTS idx_leads_campanha_id 
ON leads(campanha_id);
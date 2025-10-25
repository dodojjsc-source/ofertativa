-- Remover a foreign key antiga que está causando ambiguidade
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_campanha_id_fkey;
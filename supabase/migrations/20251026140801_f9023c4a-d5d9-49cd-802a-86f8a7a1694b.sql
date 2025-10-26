-- 1. Criar tabela temporária com leads únicos (mantendo o primeiro de cada duplicata)
CREATE TEMP TABLE leads_unicos AS
SELECT DISTINCT ON (telefone, campanha_id)
  id, nome, telefone, email, campanha_id, corretor_id, gestor_id, 
  status, feedback, repassar_bitrix, data_atendimento, observacao,
  tentativas_contato, created_at, updated_at
FROM leads
ORDER BY telefone, campanha_id, created_at ASC;

-- 2. Identificar e deletar duplicatas (mantendo apenas os IDs da tabela temporária)
DELETE FROM leads
WHERE id NOT IN (SELECT id FROM leads_unicos);

-- 3. Atualizar total_leads de todas as campanhas afetadas
UPDATE campanhas
SET total_leads = (
  SELECT COUNT(*) 
  FROM leads 
  WHERE campanha_id = campanhas.id
);

-- 4. Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unique_phone_campanha 
ON leads (telefone, campanha_id);

-- 5. Criar função para atualizar automaticamente total_leads
CREATE OR REPLACE FUNCTION update_campanha_total_leads()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE campanhas
    SET total_leads = (
      SELECT COUNT(*) FROM leads WHERE campanha_id = OLD.campanha_id
    )
    WHERE id = OLD.campanha_id;
    RETURN OLD;
  ELSE
    UPDATE campanhas
    SET total_leads = (
      SELECT COUNT(*) FROM leads WHERE campanha_id = NEW.campanha_id
    )
    WHERE id = NEW.campanha_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Criar trigger para atualizar total_leads automaticamente
DROP TRIGGER IF EXISTS trigger_update_campanha_total_leads ON leads;
CREATE TRIGGER trigger_update_campanha_total_leads
AFTER INSERT OR DELETE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_campanha_total_leads();
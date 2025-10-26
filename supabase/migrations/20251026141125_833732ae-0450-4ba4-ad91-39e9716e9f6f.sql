-- Deletar todos os leads da campanha "Verti RD"
DELETE FROM leads
WHERE campanha_id IN (
  SELECT id FROM campanhas WHERE nome = 'Verti RD'
);

-- O trigger vai atualizar automaticamente o total_leads da campanha para 0
-- Deletar todos os leads órfãos (sem campanha_id)
DELETE FROM leads 
WHERE campanha_id IS NULL;

-- Deletar campanhas "Verti RD" órfãs (sem leads associados)
DELETE FROM campanhas 
WHERE nome LIKE '%Verti RD%' 
  AND id NOT IN (
    SELECT DISTINCT campanha_id 
    FROM leads 
    WHERE campanha_id IS NOT NULL
  );
-- Sincronizar gestor_id dos leads com o gestor_id do corretor atribuído
-- Isso corrige inconsistências onde o lead tem um gestor diferente do gestor do corretor
UPDATE leads
SET gestor_id = profiles.gestor_id
FROM profiles
WHERE leads.corretor_id = profiles.id
  AND leads.gestor_id != profiles.gestor_id
  AND profiles.gestor_id IS NOT NULL;
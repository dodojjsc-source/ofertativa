-- Adicionar política RLS para corretores inserirem na fila Bitrix
CREATE POLICY "Corretores podem inserir na fila Bitrix"
ON bitrix_queue
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'corretor'::app_role) 
  AND corretor_id = auth.uid()
);
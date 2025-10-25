-- Update RLS policy to allow corretores to release leads back to pool (set corretor_id = NULL)
DROP POLICY IF EXISTS "Corretores podem atualizar seus leads" ON public.leads;

CREATE POLICY "Corretores podem atualizar seus leads"
ON public.leads
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'corretor'::app_role)
  AND (corretor_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'corretor'::app_role)
  AND (
    -- manter com o corretor atual
    corretor_id = auth.uid()
    -- ou liberar para o pool de campanha
    OR corretor_id IS NULL
  )
);

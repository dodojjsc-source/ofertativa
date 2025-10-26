BEGIN;

-- Recreate policies to allow gestores and corretores to read opt-outs for metrics
DROP POLICY IF EXISTS "Gestores podem ver seus opt-outs" ON public.optout_contacts;
CREATE POLICY "Gestores podem ver seus opt-outs"
ON public.optout_contacts
FOR SELECT
USING (has_role(auth.uid(), 'gestor'::app_role) AND gestor_id = auth.uid());

DROP POLICY IF EXISTS "Corretores podem ver seus opt-outs" ON public.optout_contacts;
CREATE POLICY "Corretores podem ver seus opt-outs"
ON public.optout_contacts
FOR SELECT
USING (has_role(auth.uid(), 'corretor'::app_role) AND corretor_id = auth.uid());

COMMIT;
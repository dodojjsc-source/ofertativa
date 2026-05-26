-- Gestor vê campanhas que: ele criou, OU estão sem dono (criadas pelo admin),
-- OU tem lead de algum corretor da equipe dele.
DROP POLICY IF EXISTS "Gestores podem ver suas campanhas" ON public.campanhas;
CREATE POLICY "Gestores podem ver suas campanhas"
  ON public.campanhas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      gestor_id IS NULL OR
      nome IN (
        SELECT DISTINCT campanha FROM public.leads
        WHERE corretor_id IN (
          SELECT id FROM public.profiles WHERE gestor_id = auth.uid()
        )
        AND campanha IS NOT NULL
      )
    )
  );

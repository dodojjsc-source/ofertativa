-- Corrige RLS pra gestor enxergar leads/assignments/bitrix_queue da equipe inteira,
-- mesmo quando a coluna gestor_id da linha estiver nula/desatualizada.
-- O cruzamento passa a ser via profiles.gestor_id (relação viva entre corretor e gestor).

-- ============== LEADS ==============
DROP POLICY IF EXISTS "Gestores podem ver leads da equipe" ON public.leads;
CREATE POLICY "Gestores podem ver leads da equipe"
  ON public.leads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      corretor_id IN (SELECT id FROM public.profiles WHERE gestor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Gestores podem atualizar leads da equipe" ON public.leads;
CREATE POLICY "Gestores podem atualizar leads da equipe"
  ON public.leads FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      corretor_id IN (SELECT id FROM public.profiles WHERE gestor_id = auth.uid())
    )
  );

-- ============== ASSIGNMENTS ==============
DROP POLICY IF EXISTS "Gestores podem ver assignments da equipe" ON public.assignments;
CREATE POLICY "Gestores podem ver assignments da equipe"
  ON public.assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      corretor_id IN (SELECT id FROM public.profiles WHERE gestor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Gestores podem atualizar assignments da equipe" ON public.assignments;
CREATE POLICY "Gestores podem atualizar assignments da equipe"
  ON public.assignments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      corretor_id IN (SELECT id FROM public.profiles WHERE gestor_id = auth.uid())
    )
  );

-- ============== BITRIX_QUEUE ==============
DROP POLICY IF EXISTS "Gestores podem ver fila Bitrix da equipe" ON public.bitrix_queue;
CREATE POLICY "Gestores podem ver fila Bitrix da equipe"
  ON public.bitrix_queue FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      corretor_id IN (SELECT id FROM public.profiles WHERE gestor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Gestores podem atualizar fila Bitrix da equipe" ON public.bitrix_queue;
CREATE POLICY "Gestores podem atualizar fila Bitrix da equipe"
  ON public.bitrix_queue FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND (
      gestor_id = auth.uid() OR
      corretor_id IN (SELECT id FROM public.profiles WHERE gestor_id = auth.uid())
    )
  );

-- Policy de profiles "Gestores podem ver seus corretores" já existe e cobre o caso.

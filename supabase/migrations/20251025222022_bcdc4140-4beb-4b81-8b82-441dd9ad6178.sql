-- Permitir corretores verem campanhas dos leads atribuídos a eles
CREATE POLICY "Corretores veem campanhas de seus leads"
ON public.campanhas
FOR SELECT
USING (
  has_role(auth.uid(), 'corretor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.campanha_id = campanhas.id
    AND leads.corretor_id = auth.uid()
  )
);

-- Criar índice para otimizar queries de fila
CREATE INDEX IF NOT EXISTS idx_leads_queue
ON public.leads (corretor_id, status, data_atendimento, created_at);
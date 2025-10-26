-- ========================================
-- PARTE 1: Políticas DELETE apenas para Admin
-- ========================================

-- Política DELETE para leads (apenas admin)
CREATE POLICY "Admins podem deletar leads"
ON public.leads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política DELETE para campanhas (apenas admin)
CREATE POLICY "Admins podem deletar campanhas"
ON public.campanhas
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política DELETE para assignments (apenas admin)
CREATE POLICY "Admins podem deletar assignments"
ON public.assignments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política DELETE para bitrix_queue (apenas admin)
CREATE POLICY "Admins podem deletar da fila Bitrix"
ON public.bitrix_queue
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- PARTE 2: Integridade Referencial com CASCADE
-- ========================================

-- Primeiro, remover constraints existentes se houver
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_campanha_id_fkey;
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_lead_id_fkey;
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_campanha_id_fkey;
ALTER TABLE public.bitrix_queue DROP CONSTRAINT IF EXISTS bitrix_queue_lead_id_fkey;
ALTER TABLE public.bitrix_queue DROP CONSTRAINT IF EXISTS bitrix_queue_campanha_id_fkey;

-- Adicionar foreign keys com ON DELETE CASCADE
ALTER TABLE public.leads
ADD CONSTRAINT leads_campanha_id_fkey
FOREIGN KEY (campanha_id)
REFERENCES public.campanhas(id)
ON DELETE CASCADE;

ALTER TABLE public.assignments
ADD CONSTRAINT assignments_lead_id_fkey
FOREIGN KEY (lead_id)
REFERENCES public.leads(id)
ON DELETE CASCADE;

ALTER TABLE public.assignments
ADD CONSTRAINT assignments_campanha_id_fkey
FOREIGN KEY (campanha_id)
REFERENCES public.campanhas(id)
ON DELETE CASCADE;

ALTER TABLE public.bitrix_queue
ADD CONSTRAINT bitrix_queue_lead_id_fkey
FOREIGN KEY (lead_id)
REFERENCES public.leads(id)
ON DELETE CASCADE;

ALTER TABLE public.bitrix_queue
ADD CONSTRAINT bitrix_queue_campanha_id_fkey
FOREIGN KEY (campanha_id)
REFERENCES public.campanhas(id)
ON DELETE CASCADE;
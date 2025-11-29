-- Ajustar foreign keys para permitir exclusão de usuários com leads
-- Os leads ficarão sem corretor/gestor ao invés de bloquear a exclusão

-- 1. Tabela leads
ALTER TABLE public.leads 
  DROP CONSTRAINT IF EXISTS leads_corretor_id_fkey,
  DROP CONSTRAINT IF EXISTS leads_gestor_id_fkey;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_corretor_id_fkey 
    FOREIGN KEY (corretor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT leads_gestor_id_fkey 
    FOREIGN KEY (gestor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 2. Tabela assignments
ALTER TABLE public.assignments 
  DROP CONSTRAINT IF EXISTS assignments_corretor_id_fkey,
  DROP CONSTRAINT IF EXISTS assignments_gestor_id_fkey;

ALTER TABLE public.assignments
  ADD CONSTRAINT assignments_corretor_id_fkey 
    FOREIGN KEY (corretor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT assignments_gestor_id_fkey 
    FOREIGN KEY (gestor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 3. Tabela campanhas
ALTER TABLE public.campanhas 
  DROP CONSTRAINT IF EXISTS campanhas_gestor_id_fkey;

ALTER TABLE public.campanhas
  ADD CONSTRAINT campanhas_gestor_id_fkey 
    FOREIGN KEY (gestor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 4. Tabela bitrix_queue
ALTER TABLE public.bitrix_queue 
  DROP CONSTRAINT IF EXISTS bitrix_queue_corretor_id_fkey,
  DROP CONSTRAINT IF EXISTS bitrix_queue_gestor_id_fkey,
  DROP CONSTRAINT IF EXISTS bitrix_queue_processado_por_fkey;

ALTER TABLE public.bitrix_queue
  ADD CONSTRAINT bitrix_queue_corretor_id_fkey 
    FOREIGN KEY (corretor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT bitrix_queue_gestor_id_fkey 
    FOREIGN KEY (gestor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL,
  ADD CONSTRAINT bitrix_queue_processado_por_fkey 
    FOREIGN KEY (processado_por) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
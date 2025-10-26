-- Remove todas as foreign keys duplicadas de leads.campanha_id
DO $$ 
DECLARE
    constraint_name_var text;
BEGIN
    FOR constraint_name_var IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'leads' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%campanha%'
    LOOP
        EXECUTE format('ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
    END LOOP;
END $$;

-- Recriar apenas UMA foreign key limpa com CASCADE
ALTER TABLE public.leads
ADD CONSTRAINT leads_campanha_id_fkey
FOREIGN KEY (campanha_id)
REFERENCES public.campanhas(id)
ON DELETE CASCADE;
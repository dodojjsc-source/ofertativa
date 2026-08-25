-- Colunas que existiam no banco Lovable (criadas via SQL editor, fora das migrations)
-- Detectadas no diff da migracao pro Supabase proprio em 25/08/2026
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nome_original text;
ALTER TABLE public.disparo_fila ADD COLUMN IF NOT EXISTS nome_original text;

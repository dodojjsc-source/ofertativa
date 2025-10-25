-- FASE 1: CORREÇÃO CRÍTICA DE SEGURANÇA (VERSÃO FINAL)
-- Criar tabela user_roles separada para evitar vulnerabilidades

-- 1. Criar tabela de roles separada
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- 2. Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas: apenas admins podem modificar roles
CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
);

-- 4. Todos podem ver seus próprios roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Migrar dados existentes de profiles.role para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
WHERE role IS NOT NULL;

-- 6. Remover política que depende de profiles.role
DROP POLICY IF EXISTS "Gestores podem inserir corretores vinculados" ON public.profiles;

-- 7. Remover coluna role da tabela profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- 8. Recriar política simplificada (gestor pode inserir perfis vinculados a ele)
CREATE POLICY "Gestores podem inserir corretores vinculados"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) 
    AND (gestor_id = auth.uid())
);

-- 9. Atualizar função has_role() para usar nova tabela
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 10. Atualizar trigger handle_new_user() para criar role em user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_role app_role;
  user_gestor_id uuid;
BEGIN
  -- Extrair role dos metadados (padrão: corretor)
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'corretor'::app_role
  );
  
  -- Extrair gestor_id se existir
  user_gestor_id := (NEW.raw_user_meta_data->>'gestor_id')::uuid;

  -- 1. Criar perfil
  INSERT INTO public.profiles (id, name, email, gestor_id, status, telefone, meta_diaria)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    user_gestor_id,
    'ativo',
    NEW.raw_user_meta_data->>'telefone',
    COALESCE((NEW.raw_user_meta_data->>'meta_diaria')::integer, 60)
  );

  -- 2. Criar role na tabela separada
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);

  RETURN NEW;
END;
$$;
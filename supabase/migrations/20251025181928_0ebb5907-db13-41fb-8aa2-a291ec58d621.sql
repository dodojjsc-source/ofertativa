-- Drop todas as políticas existentes de user_roles
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios roles" ON public.user_roles;

-- Criar política para SELECT: usuários veem seu próprio role, admins veem todos
CREATE POLICY "Usuários podem ver próprio role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Criar políticas para INSERT: apenas admins
CREATE POLICY "Apenas admins podem inserir roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Criar políticas para UPDATE: apenas admins
CREATE POLICY "Apenas admins podem atualizar roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Criar políticas para DELETE: apenas admins
CREATE POLICY "Apenas admins podem deletar roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
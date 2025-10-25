-- Atualizar trigger handle_new_user para validar roles de self-signup
-- Apenas corretores podem se auto-cadastrar. Admin/Gestor precisam de convite.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  user_gestor_id uuid;
BEGIN
  -- Extrair role dos metadados
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'corretor'::app_role
  );
  
  -- VALIDAÇÃO DE SEGURANÇA: Rejeitar tentativas de criar admin/gestor via signup público
  -- Apenas convites (que têm token de confirmação) devem criar essas roles
  IF user_role IN ('admin', 'gestor') AND NEW.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Self-signup não pode criar usuários admin ou gestor. Use o sistema de convites.';
  END IF;
  
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

  -- 2. Criar role na tabela separada (forçar corretor para self-signup)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    CASE 
      WHEN NEW.email_confirmed_at IS NOT NULL THEN user_role
      ELSE 'corretor'::app_role
    END
  );

  RETURN NEW;
END;
$function$;
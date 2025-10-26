-- Criar tabela de contatos errados (apenas Admin pode acessar)
CREATE TABLE public.contatos_errados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  original_lead_id uuid NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  campanha_id uuid,
  gestor_id uuid,
  corretor_id uuid,
  reason text NOT NULL DEFAULT 'numero_errado',
  observacao text,
  flagged_by uuid,
  flagged_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.contatos_errados ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas Admin pode ver/inserir/atualizar/deletar
CREATE POLICY "Admins podem ver contatos errados"
ON public.contatos_errados
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir contatos errados"
ON public.contatos_errados
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar contatos errados"
ON public.contatos_errados
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar contatos errados"
ON public.contatos_errados
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
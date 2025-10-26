-- Criar tabela de contatos opt-out (apenas admin acessa)
CREATE TABLE public.optout_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  original_lead_id uuid NOT NULL,
  nome text NOT NULL,
  telefone text NOT NULL,
  email text,
  campanha_id uuid,
  gestor_id uuid,
  corretor_id uuid,
  observacao text,
  flagged_by uuid,
  flagged_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.optout_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: apenas Admin pode acessar
CREATE POLICY "Admins podem ver opt-outs"
ON public.optout_contacts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem inserir opt-outs"
ON public.optout_contacts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem atualizar opt-outs"
ON public.optout_contacts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins podem deletar opt-outs"
ON public.optout_contacts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
-- Criar enums
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'corretor');
CREATE TYPE public.lead_status AS ENUM ('pendente', 'atendido', 'nao_atendido');
CREATE TYPE public.feedback_type AS ENUM ('interessado', 'agendado', 'recusou', 'optout');
CREATE TYPE public.bitrix_status AS ENUM ('pendente', 'processado', 'erro', 'descartado');
CREATE TYPE public.assignment_status AS ENUM ('pendente', 'concluido');
CREATE TYPE public.user_status AS ENUM ('ativo', 'inativo');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  role app_role NOT NULL DEFAULT 'corretor',
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status user_status NOT NULL DEFAULT 'ativo',
  meta_diaria INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de campanhas
CREATE TABLE public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data_upload TIMESTAMPTZ NOT NULL DEFAULT now(),
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_leads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'pendente',
  feedback feedback_type,
  observacao TEXT,
  repassar_bitrix BOOLEAN DEFAULT FALSE,
  data_atendimento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de atribuições
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  corretor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE CASCADE,
  status_distribuicao assignment_status NOT NULL DEFAULT 'pendente',
  timestamp_atribuicao TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de fila Bitrix
CREATE TABLE public.bitrix_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  gestor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  feedback feedback_type,
  observacao TEXT,
  status_fila bitrix_status NOT NULL DEFAULT 'pendente',
  timestamp_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  timestamp_processamento TIMESTAMPTZ,
  processado_por UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_queue ENABLE ROW LEVEL SECURITY;

-- Função de segurança para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role AND status = 'ativo'
  );
$$;

-- Função para obter o gestor_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_gestor_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gestor_id
  FROM public.profiles
  WHERE id = _user_id;
$$;

-- RLS Policies para profiles
CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver seus corretores"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND 
    (gestor_id = auth.uid() OR id = auth.uid())
  );

CREATE POLICY "Corretores podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'corretor') AND id = auth.uid());

CREATE POLICY "Admins podem inserir perfis"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem inserir corretores vinculados"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor') AND 
    gestor_id = auth.uid() AND 
    role = 'corretor'
  );

CREATE POLICY "Admins podem atualizar perfis"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem atualizar seus corretores"
  ON public.profiles FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND 
    (gestor_id = auth.uid() OR id = auth.uid())
  );

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins podem deletar perfis"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para campanhas
CREATE POLICY "Admins podem ver todas as campanhas"
  ON public.campanhas FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver suas campanhas"
  ON public.campanhas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

CREATE POLICY "Corretores podem ver campanhas vinculadas"
  ON public.campanhas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'corretor') AND 
    gestor_id = public.get_user_gestor_id(auth.uid())
  );

CREATE POLICY "Admins e Gestores podem inserir campanhas"
  ON public.campanhas FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    (public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid())
  );

CREATE POLICY "Admins podem atualizar campanhas"
  ON public.campanhas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem atualizar suas campanhas"
  ON public.campanhas FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

-- RLS Policies para leads
CREATE POLICY "Admins podem ver todos os leads"
  ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver leads da equipe"
  ON public.leads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

CREATE POLICY "Corretores podem ver seus leads"
  ON public.leads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid()
  );

CREATE POLICY "Admins e Gestores podem inserir leads"
  ON public.leads FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

CREATE POLICY "Admins podem atualizar leads"
  ON public.leads FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem atualizar leads da equipe"
  ON public.leads FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

CREATE POLICY "Corretores podem atualizar seus leads"
  ON public.leads FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid()
  );

-- RLS Policies para assignments
CREATE POLICY "Admins podem ver todos os assignments"
  ON public.assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver assignments da equipe"
  ON public.assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

CREATE POLICY "Corretores podem ver seus assignments"
  ON public.assignments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'corretor') AND corretor_id = auth.uid()
  );

CREATE POLICY "Admins e Gestores podem inserir assignments"
  ON public.assignments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

CREATE POLICY "Admins podem atualizar assignments"
  ON public.assignments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem atualizar assignments da equipe"
  ON public.assignments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

-- RLS Policies para bitrix_queue
CREATE POLICY "Admins podem ver toda a fila Bitrix"
  ON public.bitrix_queue FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver fila da equipe"
  ON public.bitrix_queue FOR SELECT
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

CREATE POLICY "Admins e Gestores podem inserir na fila"
  ON public.bitrix_queue FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  );

CREATE POLICY "Admins podem atualizar fila Bitrix"
  ON public.bitrix_queue FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem atualizar fila da equipe"
  ON public.bitrix_queue FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'gestor') AND gestor_id = auth.uid()
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar timestamp_processamento ao processar fila
CREATE OR REPLACE FUNCTION public.set_bitrix_queue_processamento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status_fila = 'processado' AND OLD.status_fila != 'processado' THEN
    NEW.timestamp_processamento = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bitrix_queue_processamento
  BEFORE UPDATE ON public.bitrix_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_bitrix_queue_processamento();

-- Trigger para criar perfil ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'corretor'),
    'ativo'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
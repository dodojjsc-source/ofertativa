-- 25/10/2026: entrada unica pelo Portal do Corretor + vinculo com o lead do Bitrix (Funil Vivo -> Oferta ativa)
-- profiles.bitrix_id: ID do usuario no Bitrix (o mesmo do Hub). Resolve corretor sem depender do e-mail de login.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bitrix_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_bitrix_id_uniq
  ON public.profiles (bitrix_id) WHERE bitrix_id IS NOT NULL;

-- leads.bitrix_lead_id: lead do CRM que originou este lead de oferta ativa. Base da deduplicacao e do retorno do feedback.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bitrix_lead_id BIGINT;
CREATE INDEX IF NOT EXISTS leads_bitrix_lead_id_idx
  ON public.leads (bitrix_lead_id) WHERE bitrix_lead_id IS NOT NULL;
-- o mesmo lead do Bitrix entra UMA vez por campanha (idempotencia do botao do Funil Vivo)
CREATE UNIQUE INDEX IF NOT EXISTS leads_bitrix_lead_campanha_uniq
  ON public.leads (bitrix_lead_id, campanha_id) WHERE bitrix_lead_id IS NOT NULL;

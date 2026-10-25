-- 25/10/2026: retorno da oferta ativa pro Bitrix (item 3). Marca quando o robo ofertativa_retorno.py
-- ja devolveu o resultado deste lead pro card do CRM (idempotencia: so volta uma vez).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bitrix_retorno_em TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bitrix_retorno_tipo TEXT;
CREATE INDEX IF NOT EXISTS leads_bitrix_retorno_pend_idx
  ON public.leads (bitrix_lead_id) WHERE bitrix_lead_id IS NOT NULL AND bitrix_retorno_em IS NULL;

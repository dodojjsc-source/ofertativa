-- RPC pra contar leads por campanha sem precisar carregar tudo em memória
CREATE OR REPLACE FUNCTION public.count_leads_por_campanha()
RETURNS TABLE (campanha_id UUID, total BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT campanha_id, COUNT(*) AS total
  FROM public.leads
  WHERE campanha_id IS NOT NULL
  GROUP BY campanha_id;
$$;

GRANT EXECUTE ON FUNCTION public.count_leads_por_campanha() TO authenticated;

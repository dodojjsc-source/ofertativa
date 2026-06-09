-- =====================================================
-- OPT-OUT MANUAL: corretor sinaliza quando cliente pede pra sair
-- =====================================================
-- No modo manual o sistema nao recebe webhook das respostas (vai pra
-- WhatsApp pessoal do corretor). Quando cliente pede SAIR, corretor
-- sinaliza pela UI e a RPC abaixo:
--   1. Marca a fila como cancelada/respondida (some das listas)
--   2. Limpa msg2_pronto_em (nao reabordar na Onda 2)
--   3. Insere no optout_contacts global (bloqueia em qualquer plantao futuro)

CREATE OR REPLACE FUNCTION public.sinalizar_optout_manual(
  _fila_id UUID,
  _motivo TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _row RECORD;
BEGIN
  SELECT id, nome, telefone, telefone_norm, plantao_id, corretor_id
  INTO _row
  FROM public.disparo_fila
  WHERE id = _fila_id AND corretor_id = auth.uid();

  IF _row.id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.disparo_fila
  SET status = 'cancelado'::disparo_fila_status,
      abordagem_status = 'respondida'::abordagem_manual_status,
      abordagem_motivo_nao_envio = COALESCE(_motivo, 'Cliente pediu SAIR'),
      msg2_pronto_em = NULL,
      msg2_status = NULL,
      updated_at = now()
  WHERE id = _fila_id;

  INSERT INTO public.optout_contacts (
    original_lead_id, nome, telefone, corretor_id, observacao, flagged_by
  )
  VALUES (
    _row.id,
    _row.nome,
    _row.telefone_norm,
    _row.corretor_id,
    COALESCE(_motivo, 'Sinalizado manualmente pelo corretor: cliente pediu SAIR'),
    auth.uid()
  );

  RETURN TRUE;
END;
$$;

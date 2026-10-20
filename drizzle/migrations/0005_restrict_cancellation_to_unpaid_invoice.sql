CREATE OR REPLACE FUNCTION public.require_invoice_cancellation_reason()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Only an unpaid invoice can be cancelled.' USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'cancelled' AND OLD.status <> 'invoiced' THEN
      RAISE EXCEPTION 'Only an unpaid invoice can be cancelled.' USING ERRCODE = '23514';
    END IF;
    IF NULLIF(BTRIM(NEW.cancel_reason), '') IS NULL THEN
      RAISE EXCEPTION 'A reason is required to cancel an invoice.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
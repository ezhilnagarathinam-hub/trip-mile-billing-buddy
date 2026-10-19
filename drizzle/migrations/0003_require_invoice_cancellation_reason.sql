CREATE OR REPLACE FUNCTION public.require_invoice_cancellation_reason()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND NULLIF(BTRIM(NEW.cancel_reason), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required to cancel an invoice.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trips_require_invoice_cancellation_reason
BEFORE INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.require_invoice_cancellation_reason();
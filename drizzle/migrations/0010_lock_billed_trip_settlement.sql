CREATE OR REPLACE FUNCTION public.guard_billed_trip_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.driver_bata_settled IS DISTINCT FROM OLD.driver_bata_settled
     OR NEW.driver_bata_settled_at IS DISTINCT FROM OLD.driver_bata_settled_at THEN
    IF EXISTS (
      SELECT 1
      FROM public.driver_bata_bills bill
      WHERE OLD.id = ANY(bill.trip_ids)
        AND (bill.status = 'paid' OR (bill.status = 'pending' AND NEW.driver_bata_settled))
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Settle this trip through its driver bata bill.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_billed_trip_settlement
BEFORE UPDATE OF driver_bata_settled, driver_bata_settled_at ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.guard_billed_trip_settlement();

CREATE OR REPLACE FUNCTION public.mark_driver_bata_bill_paid(_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bill public.driver_bata_bills%ROWTYPE;
  eligible_count integer;
  expected_amount numeric;
  updated_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only an administrator can mark driver bata bills as paid.';
  END IF;

  SELECT * INTO bill
    FROM public.driver_bata_bills
    WHERE id = _bill_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Driver bata bill not found.';
  END IF;

  IF bill.status = 'paid' THEN
    RETURN;
  END IF;

  IF cardinality(bill.trip_ids) > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('driver-bata-bill:' || bill.driver_id::text, 0));

    SELECT count(*), COALESCE(sum(driver_bata), 0)
      INTO eligible_count, expected_amount
      FROM public.trips
      WHERE id = ANY(bill.trip_ids)
        AND driver_id = bill.driver_id
        AND end_time IS NOT NULL
        AND driver_bata_settled = false;

    IF eligible_count <> cardinality(bill.trip_ids) OR expected_amount <> bill.amount THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'One or more trips are no longer eligible for this bill; refresh the bata list before marking it paid.';
    END IF;

    UPDATE public.driver_bata_bills
      SET status = 'paid', paid_at = now()
      WHERE id = _bill_id;

    UPDATE public.trips
      SET driver_bata_settled = true,
          driver_bata_settled_at = now()
      WHERE id = ANY(bill.trip_ids)
        AND driver_id = bill.driver_id
        AND driver_bata_settled = false;
    GET DIAGNOSTICS updated_count = ROW_COUNT;

    IF updated_count <> cardinality(bill.trip_ids) THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'The selected trips changed during settlement; refresh the bata list and retry.';
    END IF;
  ELSE
    UPDATE public.driver_bata_bills
      SET status = 'paid', paid_at = now()
      WHERE id = _bill_id;
  END IF;
END;
$$;
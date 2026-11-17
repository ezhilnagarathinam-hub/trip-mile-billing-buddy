CREATE OR REPLACE FUNCTION public.validate_driver_bata_bill_trips()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eligible_count integer;
  expected_amount numeric;
BEGIN
  IF cardinality(NEW.trip_ids) = 0 THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('driver-bata-bill:' || NEW.driver_id::text, 0));

  SELECT count(*), COALESCE(sum(driver_bata), 0)
    INTO eligible_count, expected_amount
    FROM public.trips
    WHERE id = ANY(NEW.trip_ids)
      AND driver_id = NEW.driver_id
      AND end_time IS NOT NULL
      AND driver_bata_settled = false;

  IF eligible_count <> cardinality(NEW.trip_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Select only completed, unpaid trips belonging to this driver.';
  END IF;

  IF expected_amount <> NEW.amount THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The bill amount must equal the selected trips’ driver bata total.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.driver_bata_bills
    WHERE driver_bata_bills.driver_id = NEW.driver_id
      AND driver_bata_bills.trip_ids && NEW.trip_ids
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'One or more selected trips already appear in a driver bata bill.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_driver_bata_bill_trips
BEFORE INSERT ON public.driver_bata_bills
FOR EACH ROW EXECUTE FUNCTION public.validate_driver_bata_bill_trips();

CREATE OR REPLACE FUNCTION public.mark_driver_bata_bill_paid(_bill_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bill public.driver_bata_bills%ROWTYPE;
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
    UPDATE public.trips
      SET driver_bata_settled = true,
          driver_bata_settled_at = now()
      WHERE id = ANY(bill.trip_ids)
        AND driver_id = bill.driver_id
        AND driver_bata_settled = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'One or more trips have already been settled; refresh the bata list before marking this bill paid.';
    END IF;
  END IF;

  UPDATE public.driver_bata_bills
    SET status = 'paid', paid_at = now()
    WHERE id = _bill_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_driver_bata_bill_paid(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_driver_bata_bill_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_driver_bata_bill_paid(uuid) TO service_role;
ALTER TABLE public.trips
  ADD COLUMN driver_bata_settled boolean NOT NULL DEFAULT false,
  ADD COLUMN driver_bata_settled_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_trip_pricing_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  configured_rate numeric;
  configured_minimum_km numeric;
  configured_minimum_fare numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT rate_per_km, minimum_km, minimum_fare
      INTO configured_rate, configured_minimum_km, configured_minimum_fare
      FROM public.settings
      WHERE id = 1;

    IF FOUND THEN
      NEW.rate_per_km := configured_rate;
      NEW.minimum_km := configured_minimum_km;
      NEW.minimum_fare := configured_minimum_fare;
    END IF;

    NEW.driver_bata_settled := false;
    NEW.driver_bata_settled_at := NULL;
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND (
       NEW.rate_per_km IS DISTINCT FROM OLD.rate_per_km
       OR NEW.minimum_km IS DISTINCT FROM OLD.minimum_km
       OR NEW.minimum_fare IS DISTINCT FROM OLD.minimum_fare
       OR NEW.driver_bata_settled IS DISTINCT FROM OLD.driver_bata_settled
       OR NEW.driver_bata_settled_at IS DISTINCT FROM OLD.driver_bata_settled_at
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Administrator-managed trip pricing and driver settlements cannot be changed by drivers.';
  END IF;

  IF NEW.driver_bata_settled IS DISTINCT FROM OLD.driver_bata_settled
     OR NEW.driver_bata_settled_at IS DISTINCT FROM OLD.driver_bata_settled_at THEN
    IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      IF NEW.driver_bata_settled THEN
        NEW.driver_bata_settled_at := COALESCE(NEW.driver_bata_settled_at, now());
      ELSE
        NEW.driver_bata_settled_at := NULL;
      END IF;
    ELSE
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Only an administrator can update driver bata settlement status.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
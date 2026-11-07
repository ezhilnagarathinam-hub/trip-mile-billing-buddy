ALTER TABLE public.settings
  ADD COLUMN minimum_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN minimum_fare numeric NOT NULL DEFAULT 0;

ALTER TABLE public.trips
  ADD COLUMN minimum_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN minimum_fare numeric NOT NULL DEFAULT 0;

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

    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND (
       NEW.rate_per_km IS DISTINCT FROM OLD.rate_per_km
       OR NEW.minimum_km IS DISTINCT FROM OLD.minimum_km
       OR NEW.minimum_fare IS DISTINCT FROM OLD.minimum_fare
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Trip pricing is set by the administrator and cannot be changed.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_trip_pricing_snapshot
BEFORE INSERT OR UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.enforce_trip_pricing_snapshot();
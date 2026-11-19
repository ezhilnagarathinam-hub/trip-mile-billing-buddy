ALTER TABLE public.settings
  ADD COLUMN trip_type_configs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.trips
  ADD COLUMN trip_type text NOT NULL DEFAULT 'Outstation',
  ADD COLUMN driver_bata_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN driver_bata_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN driver_bata_value numeric NOT NULL DEFAULT 0;

UPDATE public.settings
SET trip_type_configs = jsonb_build_array(
  jsonb_build_object(
    'name', 'Outstation',
    'rate_per_km', rate_per_km,
    'minimum_km', minimum_km,
    'minimum_fare', minimum_fare,
    'up_down', up_down,
    'driver_bata_enabled', true,
    'driver_bata_mode', 'fixed',
    'driver_bata_value', driver_bata,
    'payment_link', default_payment_link
  ),
  jsonb_build_object(
    'name', 'Local Trip',
    'rate_per_km', rate_per_km,
    'minimum_km', minimum_km,
    'minimum_fare', minimum_fare,
    'up_down', up_down,
    'driver_bata_enabled', true,
    'driver_bata_mode', 'fixed',
    'driver_bata_value', driver_bata,
    'payment_link', default_payment_link
  ),
  jsonb_build_object(
    'name', 'Day Rent',
    'rate_per_km', rate_per_km,
    'minimum_km', minimum_km,
    'minimum_fare', minimum_fare,
    'up_down', up_down,
    'driver_bata_enabled', true,
    'driver_bata_mode', 'fixed',
    'driver_bata_value', driver_bata,
    'payment_link', default_payment_link
  )
)
WHERE id = 1 AND jsonb_array_length(trip_type_configs) = 0;

UPDATE public.trips
SET driver_bata_value = driver_bata;

CREATE OR REPLACE FUNCTION public.enforce_trip_pricing_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  configured public.settings%ROWTYPE;
  type_config jsonb;
  billed_km numeric;
  distance_fare numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO configured
    FROM public.settings
    WHERE id = 1;

    IF FOUND THEN
      SELECT item INTO type_config
      FROM jsonb_array_elements(COALESCE(configured.trip_type_configs, '[]'::jsonb)) AS configs(item)
      WHERE item->>'name' = NEW.trip_type
      LIMIT 1;

      IF jsonb_array_length(COALESCE(configured.trip_type_configs, '[]'::jsonb)) > 0 AND type_config IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Select a trip type configured by the administrator.';
      END IF;

      IF type_config IS NOT NULL THEN
        NEW.rate_per_km := COALESCE((type_config->>'rate_per_km')::numeric, configured.rate_per_km);
        NEW.minimum_km := COALESCE((type_config->>'minimum_km')::numeric, configured.minimum_km);
        NEW.minimum_fare := COALESCE((type_config->>'minimum_fare')::numeric, configured.minimum_fare);
        NEW.up_down := COALESCE((type_config->>'up_down')::boolean, configured.up_down);
        NEW.driver_bata_enabled := COALESCE((type_config->>'driver_bata_enabled')::boolean, true);
        NEW.driver_bata_mode := CASE WHEN type_config->>'driver_bata_mode' = 'percentage' THEN 'percentage' ELSE 'fixed' END;
        NEW.driver_bata_value := COALESCE((type_config->>'driver_bata_value')::numeric, configured.driver_bata);
        NEW.payment_link := COALESCE(type_config->>'payment_link', configured.default_payment_link);
      ELSE
        NEW.rate_per_km := configured.rate_per_km;
        NEW.minimum_km := configured.minimum_km;
        NEW.minimum_fare := configured.minimum_fare;
        NEW.up_down := configured.up_down;
        NEW.driver_bata_enabled := true;
        NEW.driver_bata_mode := 'fixed';
        NEW.driver_bata_value := configured.driver_bata;
        NEW.payment_link := configured.default_payment_link;
      END IF;
      NEW.driver_bata_included := configured.include_driver_bata_in_invoice;
    END IF;

    NEW.driver_bata_settled := false;
    NEW.driver_bata_settled_at := NULL;
  ELSE
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
       AND (
         NEW.trip_type IS DISTINCT FROM OLD.trip_type
         OR NEW.rate_per_km IS DISTINCT FROM OLD.rate_per_km
         OR NEW.minimum_km IS DISTINCT FROM OLD.minimum_km
         OR NEW.minimum_fare IS DISTINCT FROM OLD.minimum_fare
         OR NEW.driver_bata_value IS DISTINCT FROM OLD.driver_bata_value
         OR NEW.driver_bata_mode IS DISTINCT FROM OLD.driver_bata_mode
         OR NEW.driver_bata_enabled IS DISTINCT FROM OLD.driver_bata_enabled
         OR NEW.driver_bata_included IS DISTINCT FROM OLD.driver_bata_included
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Administrator-managed trip pricing and bata rules cannot be changed by drivers.';
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
  END IF;

  IF NEW.driver_bata_enabled THEN
    IF NEW.driver_bata_mode = 'percentage' THEN
      billed_km := GREATEST(0, NEW.distance_km) * CASE WHEN NEW.up_down THEN 2 ELSE 1 END;
      IF NEW.minimum_km > 0 THEN
        distance_fare := GREATEST(0, NEW.minimum_fare)
          + ROUND(GREATEST(0, billed_km - NEW.minimum_km) * NEW.rate_per_km);
      ELSE
        distance_fare := ROUND(billed_km * NEW.rate_per_km);
      END IF;
      NEW.driver_bata := ROUND(distance_fare * GREATEST(0, NEW.driver_bata_value) / 100, 2);
    ELSE
      NEW.driver_bata := GREATEST(0, NEW.driver_bata_value);
    END IF;
  ELSE
    NEW.driver_bata := 0;
  END IF;

  RETURN NEW;
END;
$$;
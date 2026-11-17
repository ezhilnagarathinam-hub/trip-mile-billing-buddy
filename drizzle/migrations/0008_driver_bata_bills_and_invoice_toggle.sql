ALTER TABLE public.settings
  ADD COLUMN include_driver_bata_in_invoice boolean NOT NULL DEFAULT true;

ALTER TABLE public.trips
  ADD COLUMN driver_bata_included boolean NOT NULL DEFAULT true;

CREATE TABLE public.driver_bata_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_code text NOT NULL UNIQUE DEFAULT ('BB-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  driver_id uuid NOT NULL,
  driver_name text NOT NULL DEFAULT '',
  driver_phone text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  note text NOT NULL DEFAULT '',
  trip_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_bata_bills TO authenticated;
GRANT ALL ON public.driver_bata_bills TO service_role;
ALTER TABLE public.driver_bata_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers read own bata bills" ON public.driver_bata_bills FOR SELECT TO authenticated USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins manage bata bills" ON public.driver_bata_bills FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

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
  configured_driver_bata numeric;
  configured_bata_included boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT rate_per_km, minimum_km, minimum_fare, driver_bata, include_driver_bata_in_invoice
      INTO configured_rate, configured_minimum_km, configured_minimum_fare, configured_driver_bata, configured_bata_included
      FROM public.settings
      WHERE id = 1;

    IF FOUND THEN
      NEW.rate_per_km := configured_rate;
      NEW.minimum_km := configured_minimum_km;
      NEW.minimum_fare := configured_minimum_fare;
      NEW.driver_bata := configured_driver_bata;
      NEW.driver_bata_included := configured_bata_included;
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
       OR NEW.driver_bata IS DISTINCT FROM OLD.driver_bata
       OR NEW.driver_bata_included IS DISTINCT FROM OLD.driver_bata_included
       OR NEW.driver_bata_settled IS DISTINCT FROM OLD.driver_bata_settled
       OR NEW.driver_bata_settled_at IS DISTINCT FROM OLD.driver_bata_settled_at
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Administrator-managed pricing, bata inclusion and driver settlements cannot be changed by drivers.';
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
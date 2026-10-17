CREATE TABLE public.cab_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  seats integer NOT NULL DEFAULT 4,
  ac boolean NOT NULL DEFAULT true,
  features text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cab_types TO authenticated;
GRANT ALL ON public.cab_types TO service_role;
ALTER TABLE public.cab_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cab types read" ON public.cab_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cab types admin write" ON public.cab_types FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
ALTER TABLE public.trips ADD COLUMN cab_type text;
ALTER TABLE public.trips ADD COLUMN cab_details text;
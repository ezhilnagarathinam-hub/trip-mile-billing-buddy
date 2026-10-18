ALTER TABLE public.cab_types ADD COLUMN model text NOT NULL DEFAULT '';
ALTER TABLE public.cab_types ADD COLUMN cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN cab_charge numeric NOT NULL DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN cancel_reason text;
ALTER TABLE public.trips ADD COLUMN cancelled_at timestamptz;
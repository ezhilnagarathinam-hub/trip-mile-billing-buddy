create type public.app_role as enum ('admin','driver');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_approved_driver(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = _user_id and p.status = 'approved')
     and public.has_role(_user_id, 'driver')
$$;

create policy "own role read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin profile update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.email,''));
  insert into public.user_roles (user_id, role) values (new.id, 'driver');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.settings (
  id int primary key default 1,
  rate_per_km numeric not null default 14,
  up_down boolean not null default true,
  driver_bata numeric not null default 300,
  default_payment_link text not null default '',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.settings (id) values (1);
grant select, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "settings read" on public.settings for select to authenticated using (true);
create policy "settings admin update" on public.settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.charge_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.charge_items (name, amount) values ('Toll / Parking (avg)', 100), ('Night charge', 0);
grant select, insert, update, delete on public.charge_items to authenticated;
grant all on public.charge_items to service_role;
alter table public.charge_items enable row level security;
create policy "charges read" on public.charge_items for select to authenticated using (true);
create policy "charges admin write" on public.charge_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create sequence public.trip_seq start 1001;
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  trip_code text not null unique default ('RT-' || nextval('public.trip_seq')::text),
  driver_id uuid not null,
  driver_name text not null default '',
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  guests int not null default 1,
  vehicle_no text not null default '',
  start_time timestamptz,
  end_time timestamptz,
  start_lat double precision, start_lng double precision, start_address text not null default '',
  end_lat double precision, end_lng double precision, end_address text not null default '',
  distance_km numeric not null default 0,
  duration_min int not null default 0,
  rate_per_km numeric not null default 0,
  up_down boolean not null default false,
  km_charge numeric not null default 0,
  driver_bata numeric not null default 0,
  admin_charges jsonb not null default '[]',
  extra_charges jsonb not null default '[]',
  total_amount numeric not null default 0,
  payment_link text not null default '',
  status text not null default 'ongoing',
  invoiced_at timestamptz,
  paid_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
grant usage on sequence public.trip_seq to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant all on public.trips to service_role;
alter table public.trips enable row level security;
create policy "trips read" on public.trips for select to authenticated using (driver_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "trips driver insert" on public.trips for insert to authenticated with check (driver_id = auth.uid() and public.is_approved_driver(auth.uid()));
create policy "trips update" on public.trips for update to authenticated using ((driver_id = auth.uid() and public.is_approved_driver(auth.uid())) or public.has_role(auth.uid(),'admin')) with check ((driver_id = auth.uid() and public.is_approved_driver(auth.uid())) or public.has_role(auth.uid(),'admin'));
create policy "trips admin delete" on public.trips for delete to authenticated using (public.has_role(auth.uid(),'admin'));
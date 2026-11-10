create table if not exists public.vehicles (
  plate text primary key check (plate = upper(regexp_replace(trim(plate), '\s+', '', 'g')) and length(plate) > 0),
  owner_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_plate text not null references public.vehicles (plate) on update cascade on delete restrict,
  mileage integer not null check (mileage >= 0),
  oil text not null check (length(trim(oil)) > 0),
  observation text not null default '',
  occurred_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id)
);

create index if not exists maintenance_records_plate_date_idx
  on public.maintenance_records (vehicle_plate, occurred_at desc);

alter table public.vehicles enable row level security;
alter table public.maintenance_records enable row level security;

drop policy if exists "Authenticated users can view vehicles" on public.vehicles;
create policy "Authenticated users can view vehicles"
  on public.vehicles for select to authenticated using (true);

drop policy if exists "Authenticated users can add vehicles" on public.vehicles;
create policy "Authenticated users can add vehicles"
  on public.vehicles for insert to authenticated with check (true);

drop policy if exists "Authenticated users can update vehicles" on public.vehicles;
create policy "Authenticated users can update vehicles"
  on public.vehicles for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated users can view maintenance records" on public.maintenance_records;
create policy "Authenticated users can view maintenance records"
  on public.maintenance_records for select to authenticated using (true);

drop policy if exists "Authenticated users can add maintenance records" on public.maintenance_records;
create policy "Authenticated users can add maintenance records"
  on public.maintenance_records for insert to authenticated with check (auth.uid() = created_by);

grant select, insert, update on public.vehicles to authenticated;
grant select, insert on public.maintenance_records to authenticated;

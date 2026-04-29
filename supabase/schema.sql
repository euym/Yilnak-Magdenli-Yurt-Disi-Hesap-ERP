
-- =========================================
-- YILNAK ERP FULL KURULUM
-- MASRAF + AVANS + HARCIRAH
-- =========================================

create extension if not exists "pgcrypto";

-- SEFER TARİHLERİ / HARCIRAH GÜNLERİ KOLONLARI
alter table public.erp_trips add column if not exists domestic_start_date date;
alter table public.erp_trips add column if not exists domestic_exit_date date;
alter table public.erp_trips add column if not exists domestic_return_date date;
alter table public.erp_trips add column if not exists domestic_end_date date;
alter table public.erp_trips add column if not exists abroad_entry_date date;
alter table public.erp_trips add column if not exists abroad_exit_date date;
alter table public.erp_trips add column if not exists domestic_work_days numeric default 0;
alter table public.erp_trips add column if not exists abroad_work_days numeric default 0;

alter table public.erp_trips add column if not exists escort_goes_abroad boolean default true;



drop table if exists public.erp_allowances cascade;
drop table if exists public.erp_allowance_definitions cascade;
drop table if exists public.erp_advances cascade;
drop table if exists public.erp_expenses cascade;
drop table if exists public.erp_expense_definitions cascade;

create table public.erp_expense_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  default_currency text not null default 'TRY',
  created_at timestamptz default now()
);

create table public.erp_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trip_id uuid references public.erp_trips(id) on delete cascade,
  expense_definition_id uuid references public.erp_expense_definitions(id),
  country_id uuid references public.erp_countries(id),
  city_id uuid references public.erp_cities(id),
  vehicle_type text,
  fuel_status text,
  liter numeric,
  amount numeric not null,
  currency text default 'TRY',
  expense_date date,
  note text
);

create table public.erp_advances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trip_id uuid references public.erp_trips(id) on delete cascade,
  receiver_type text not null,
  receiver_name text,
  amount numeric not null,
  currency text default 'TRY',
  advance_date date,
  description text
);

create table public.erp_allowance_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domestic_daily_amount numeric default 0,
  domestic_currency text default 'TRY',
  abroad_daily_amount numeric default 0,
  abroad_currency text default 'EUR',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.erp_allowances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trip_id uuid references public.erp_trips(id) on delete cascade,

  domestic_start_date date,
  domestic_exit_date date,
  domestic_return_date date,
  domestic_end_date date,
  domestic_days numeric default 0,
  domestic_daily_amount numeric default 0,
  domestic_currency text default 'TRY',
  domestic_total numeric default 0,

  abroad_entry_date date,
  abroad_exit_date date,
  abroad_days numeric default 0,
  abroad_daily_amount numeric default 0,
  abroad_currency text default 'EUR',
  abroad_total numeric default 0,

  note text
);

insert into public.erp_expense_definitions(name, category, default_currency) values
('Mazot', 'Yakıt', 'EUR'),
('Otoban', 'Yol', 'EUR'),
('Kantar', 'Belge', 'TRY'),
('Belge', 'Belge', 'TRY'),
('Vinç', 'Operasyon', 'TRY'),
('Eskort', 'Operasyon', 'EUR')
on conflict do nothing;

insert into public.erp_allowance_definitions
(name, domestic_daily_amount, domestic_currency, abroad_daily_amount, abroad_currency, is_active)
values
('Standart Harcırah', 1200, 'TRY', 40, 'EUR', true)
on conflict do nothing;

alter table public.erp_expense_definitions enable row level security;
alter table public.erp_expenses enable row level security;
alter table public.erp_advances enable row level security;
alter table public.erp_allowance_definitions enable row level security;
alter table public.erp_allowances enable row level security;

drop policy if exists "allow_all_erp_expense_definitions" on public.erp_expense_definitions;
drop policy if exists "allow_all_erp_expenses" on public.erp_expenses;
drop policy if exists "allow_all_erp_advances" on public.erp_advances;
drop policy if exists "allow_all_erp_allowance_definitions" on public.erp_allowance_definitions;
drop policy if exists "allow_all_erp_allowances" on public.erp_allowances;

create policy "allow_all_erp_expense_definitions"
on public.erp_expense_definitions for all
to anon, authenticated
using (true)
with check (true);

create policy "allow_all_erp_expenses"
on public.erp_expenses for all
to anon, authenticated
using (true)
with check (true);

create policy "allow_all_erp_advances"
on public.erp_advances for all
to anon, authenticated
using (true)
with check (true);

create policy "allow_all_erp_allowance_definitions"
on public.erp_allowance_definitions for all
to anon, authenticated
using (true)
with check (true);

create policy "allow_all_erp_allowances"
on public.erp_allowances for all
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to anon, authenticated;
grant all privileges on all sequences in schema public to anon, authenticated;

create index if not exists idx_expenses_trip on public.erp_expenses(trip_id);
create index if not exists idx_advances_trip on public.erp_advances(trip_id);
create index if not exists idx_allowances_trip on public.erp_allowances(trip_id);

notify pgrst, 'reload schema';

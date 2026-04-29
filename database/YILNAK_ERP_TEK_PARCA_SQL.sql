-- =========================================
-- YILNAK ERP FULL KURULUM / MIGRATION
-- Masraf kategori sistemi + TL/EUR validasyon + RLS
-- =========================================

create extension if not exists "pgcrypto";

-- Sefer tablosu mevcut projede varsa kolonlar eklenir
alter table public.erp_trips add column if not exists domestic_start_date date;
alter table public.erp_trips add column if not exists domestic_exit_date date;
alter table public.erp_trips add column if not exists domestic_return_date date;
alter table public.erp_trips add column if not exists domestic_end_date date;
alter table public.erp_trips add column if not exists abroad_entry_date date;
alter table public.erp_trips add column if not exists abroad_exit_date date;
alter table public.erp_trips add column if not exists domestic_work_days numeric default 0;
alter table public.erp_trips add column if not exists abroad_work_days numeric default 0;
alter table public.erp_trips add column if not exists escort_goes_abroad boolean default true;

-- =========================================
-- MASRAF KATEGORİLERİ
-- =========================================
create table if not exists public.erp_expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  currency text not null check (currency in ('TRY','EUR')),
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

insert into public.erp_expense_categories(name, currency) values
('Yakıt', 'EUR'),
('Kantar TL', 'TRY'),
('Kantar EUR', 'EUR'),
('Yol TL', 'TRY'),
('Yol EUR', 'EUR'),
('Belge TL', 'TRY'),
('Belge EUR', 'EUR'),
('Operasyon TL', 'TRY'),
('Operasyon EUR', 'EUR'),
('Personel TL', 'TRY'),
('Personel EUR', 'EUR'),
('Diğer TL', 'TRY'),
('Diğer EUR', 'EUR')
on conflict (name) do nothing;

-- =========================================
-- MASRAF TANIMLARI / MASRAFLAR
-- =========================================
create table if not exists public.erp_expense_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  category_id uuid references public.erp_expense_categories(id),
  default_currency text not null default 'TRY' check (default_currency in ('TRY','EUR')),
  created_at timestamptz default now()
);

alter table public.erp_expense_definitions add column if not exists category text;
alter table public.erp_expense_definitions add column if not exists category_id uuid references public.erp_expense_categories(id);
alter table public.erp_expense_definitions add column if not exists default_currency text not null default 'TRY' check (default_currency in ('TRY','EUR'));

create table if not exists public.erp_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  trip_id uuid references public.erp_trips(id) on delete cascade,
  expense_definition_id uuid references public.erp_expense_definitions(id),
  category_id uuid references public.erp_expense_categories(id),
  country_id uuid references public.erp_countries(id),
  city_id uuid references public.erp_cities(id),
  vehicle_type text,
  fuel_status text,
  liter numeric,
  amount numeric not null,
  currency text default 'TRY' check (currency in ('TRY','EUR')),
  expense_date date,
  note text,
  description text
);

alter table public.erp_expenses add column if not exists category_id uuid references public.erp_expense_categories(id);
alter table public.erp_expenses add column if not exists currency text default 'TRY' check (currency in ('TRY','EUR'));
alter table public.erp_expenses add column if not exists description text;

-- Varsayılan masraf tanımları
insert into public.erp_expense_definitions(name, category, category_id, default_currency)
select 'Mazot', c.name, c.id, c.currency from public.erp_expense_categories c where c.name = 'Yakıt'
on conflict (name) do nothing;
insert into public.erp_expense_definitions(name, category, category_id, default_currency)
select 'Kantar TL', c.name, c.id, c.currency from public.erp_expense_categories c where c.name = 'Kantar TL'
on conflict (name) do nothing;
insert into public.erp_expense_definitions(name, category, category_id, default_currency)
select 'Kantar EUR', c.name, c.id, c.currency from public.erp_expense_categories c where c.name = 'Kantar EUR'
on conflict (name) do nothing;
insert into public.erp_expense_definitions(name, category, category_id, default_currency)
select 'Otoban EUR', c.name, c.id, c.currency from public.erp_expense_categories c where c.name = 'Yol EUR'
on conflict (name) do nothing;
insert into public.erp_expense_definitions(name, category, category_id, default_currency)
select 'Belge TL', c.name, c.id, c.currency from public.erp_expense_categories c where c.name = 'Belge TL'
on conflict (name) do nothing;

-- Kategori para birimi ile masraf para birimi eşleşmek zorunda
create or replace function public.check_expense_currency_match()
returns trigger as $$
declare
  def_currency text;
  def_category_id uuid;
begin
  select default_currency, category_id into def_currency, def_category_id
  from public.erp_expense_definitions
  where id = new.expense_definition_id;

  if def_currency is null then
    raise exception 'Masraf tanımı bulunamadı';
  end if;

  new.currency := coalesce(new.currency, def_currency);
  new.category_id := coalesce(new.category_id, def_category_id);

  if new.currency <> def_currency then
    raise exception 'Kategori para birimi ile masraf para birimi uyuşmuyor';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_currency on public.erp_expenses;
create trigger trg_check_currency
before insert or update on public.erp_expenses
for each row
execute function public.check_expense_currency_match();

-- =========================================
-- AVANS / HARCIRAH
-- =========================================
create table if not exists public.erp_advances (
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

create table if not exists public.erp_allowance_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domestic_daily_amount numeric default 0,
  domestic_currency text default 'TRY',
  abroad_daily_amount numeric default 0,
  abroad_currency text default 'EUR',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.erp_allowances (
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

insert into public.erp_allowance_definitions
(name, domestic_daily_amount, domestic_currency, abroad_daily_amount, abroad_currency, is_active)
values ('Standart Harcırah', 1200, 'TRY', 40, 'EUR', true)
on conflict do nothing;

-- =========================================
-- RLS SORUNU TAM ÇÖZÜM (HARCIRAH DAHİL)
-- =========================================
alter table public.erp_allowance_definitions enable row level security;
drop policy if exists "allow_all_erp_allowance_definitions" on public.erp_allowance_definitions;
create policy "allow_all_erp_allowance_definitions" on public.erp_allowance_definitions for all to anon, authenticated using (true) with check (true);

alter table public.erp_allowances enable row level security;
drop policy if exists "allow_all_erp_allowances" on public.erp_allowances;
create policy "allow_all_erp_allowances" on public.erp_allowances for all to anon, authenticated using (true) with check (true);

alter table public.erp_expense_categories enable row level security;
drop policy if exists "allow_all_erp_expense_categories" on public.erp_expense_categories;
create policy "allow_all_erp_expense_categories" on public.erp_expense_categories for all to anon, authenticated using (true) with check (true);

alter table public.erp_expense_definitions enable row level security;
drop policy if exists "allow_all_erp_expense_definitions" on public.erp_expense_definitions;
create policy "allow_all_erp_expense_definitions" on public.erp_expense_definitions for all to anon, authenticated using (true) with check (true);

alter table public.erp_expenses enable row level security;
drop policy if exists "allow_all_erp_expenses" on public.erp_expenses;
create policy "allow_all_erp_expenses" on public.erp_expenses for all to anon, authenticated using (true) with check (true);

alter table public.erp_advances enable row level security;
drop policy if exists "allow_all_erp_advances" on public.erp_advances;
create policy "allow_all_erp_advances" on public.erp_advances for all to anon, authenticated using (true) with check (true);

-- GENEL YETKİ
grant usage on schema public to anon, authenticated;
grant all privileges on all tables in schema public to anon, authenticated;
grant all privileges on all sequences in schema public to anon, authenticated;

create index if not exists idx_expenses_trip on public.erp_expenses(trip_id);
create index if not exists idx_expenses_category on public.erp_expenses(category_id);
create index if not exists idx_advances_trip on public.erp_advances(trip_id);
create index if not exists idx_allowances_trip on public.erp_allowances(trip_id);

-- CACHE RESET
notify pgrst, 'reload schema';

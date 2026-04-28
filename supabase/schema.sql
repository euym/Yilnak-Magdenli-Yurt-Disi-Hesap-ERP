create extension if not exists "pgcrypto";

create table if not exists erp_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists erp_drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists erp_tractors (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  info text,
  created_at timestamptz not null default now()
);

create table if not exists erp_trailers (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  info text,
  created_at timestamptz not null default now()
);

create table if not exists erp_escorts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists erp_escort_vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  info text,
  created_at timestamptz not null default now()
);

create table if not exists erp_countries (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists erp_cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references erp_countries(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(country_id, name)
);

create table if not exists erp_trips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  project_id uuid references erp_projects(id),
  project_name text,
  load_type text,

  load_width numeric,
  load_height numeric,
  load_length numeric,
  load_weight numeric,
  tractor_tonnage numeric,
  trailer_tonnage numeric,
  total_tonnage numeric,
  tonnage_capacity_formula numeric default 130000,
  tonnage_fill_percent numeric,

  start_country_id uuid references erp_countries(id),
  start_city_id uuid references erp_cities(id),
  unloading_country_id uuid references erp_countries(id),
  unloading_city_id uuid references erp_cities(id),
  end_country_id uuid references erp_countries(id),
  end_city_id uuid references erp_cities(id),

  trip_count numeric default 1,
  start_km numeric,
  end_km numeric,
  trip_km numeric,
  total_trip_km numeric,

  driver_id uuid references erp_drivers(id),
  tractor_id uuid references erp_tractors(id),
  tractor_info_id uuid references erp_tractors(id),
  trailer_id uuid references erp_trailers(id),
  trailer_info_id uuid references erp_trailers(id),
  escort_id uuid references erp_escorts(id),
  escort_vehicle_id uuid references erp_escort_vehicles(id),
  escort_vehicle_info_id uuid references erp_escort_vehicles(id)
);

insert into erp_countries(name) values
('Türkiye'), ('Bulgaristan'), ('Romanya'), ('Sırbistan'), ('Macaristan'), ('Almanya'), ('Fransa'), ('İtalya'), ('Avusturya'), ('Polonya'), ('Hollanda'), ('Belçika'), ('Yunanistan'), ('Gürcistan'), ('Azerbaycan')
on conflict (name) do nothing;

insert into erp_cities(country_id, name)
select c.id, x.city
from erp_countries c
join (
  values
  ('Türkiye','İstanbul'), ('Türkiye','Ankara'), ('Türkiye','İzmir'), ('Türkiye','Bursa'), ('Türkiye','Edirne'), ('Türkiye','Kocaeli'), ('Türkiye','Sakarya'), ('Türkiye','Konya'),
  ('Bulgaristan','Sofya'), ('Bulgaristan','Filibe'), ('Bulgaristan','Ruse'), ('Bulgaristan','Varna'),
  ('Romanya','Bükreş'), ('Romanya','Köstence'), ('Romanya','Timișoara'), ('Romanya','Arad'),
  ('Sırbistan','Belgrad'), ('Sırbistan','Niş'), ('Macaristan','Budapeşte'), ('Almanya','Berlin'), ('Almanya','Münih'), ('Fransa','Paris'), ('İtalya','Roma')
) as x(country, city) on x.country = c.name
on conflict (country_id, name) do nothing;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

create table if not exists erp_expense_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  default_currency text not null default 'TRY',
  created_at timestamptz not null default now()
);

create table if not exists erp_expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trip_id uuid not null references erp_trips(id) on delete cascade,
  expense_definition_id uuid not null references erp_expense_definitions(id),
  country_id uuid references erp_countries(id),
  city_id uuid references erp_cities(id),
  vehicle_type text,
  fuel_status text check (fuel_status in ('Boş', 'Dolu') or fuel_status is null),
  liter numeric,
  amount numeric not null,
  currency text not null default 'TRY',
  expense_date date,
  note text
);

insert into erp_expense_definitions(name, category, default_currency) values
('Mazot', 'Yakıt', 'EUR'),
('Otoban', 'Yol', 'EUR'),
('Kantar', 'Belge', 'TRY'),
('Belge', 'Belge', 'TRY'),
('Vinç', 'Operasyon', 'TRY'),
('Eskort', 'Operasyon', 'EUR')
on conflict (name) do nothing;


create table if not exists erp_advances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trip_id uuid not null references erp_trips(id) on delete cascade,
  receiver_type text not null,
  receiver_name text not null,
  amount numeric not null,
  currency text not null default 'TRY',
  advance_date date,
  note text
);

alter table erp_advances disable row level security;
grant select, insert, update, delete on erp_advances to anon, authenticated;


-- AVANS / MASRAF BAKIYE KONTROLÜ İÇİN INDEXLER
create index if not exists idx_erp_expenses_trip_id on public.erp_expenses(trip_id);
create index if not exists idx_erp_advances_trip_id on public.erp_advances(trip_id);

-- EstateIQ migration 001: public projects + properties catalog, with the 6 demo projects / 6 properties.
-- Run once in the Supabase SQL Editor. Safe to re-run: tables use IF NOT EXISTS and the seed rows
-- use fixed ids with ON CONFLICT DO NOTHING (re-running never duplicates or overwrites edits).
--
-- Mirrors the Project / Property models in app/lead_scoring/models.py, which the API also creates
-- on startup with create_all, so whichever runs first is fine.
--
-- Not stored on purpose: Project.unitTypes / priceRange and Property.type / price / project / city.
-- The API derives them from the rows below so they can't drift.

begin;

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  name             varchar(120) not null,
  city             varchar(20)  not null,
  locality         varchar(120) not null,
  status           varchar(30)  not null,
  features         jsonb        not null default '[]'::jsonb,   -- amenities, e.g. ["Gym","Clubhouse"]
  total_units      integer,
  available_units  integer,
  description      text,
  image            varchar(500),                                  -- a URL or /path; no uploads yet
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  constraint projects_city_check            check (city in ('Nashik','Pune')),
  constraint projects_status_check          check (status in ('Ready to move','Under construction','New launch')),
  constraint projects_total_units_check     check (total_units is null or total_units >= 0),
  constraint projects_available_units_check check (available_units is null or available_units >= 0)
);
create index if not exists ix_projects_city on public.projects (city);

-- -------------------------------------------------------------- properties
create table if not exists public.properties (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  property_type  varchar(20) not null,
  bhk            integer,
  price_lakh     numeric(10,2) not null,                          -- source of truth; "₹ 65 L" is derived
  area_sqft      integer,
  furnishing     varchar(20),
  beds           integer not null,
  baths          integer not null,
  tags           jsonb   not null default '[]'::jsonb,            -- e.g. ["Covered parking","Gym"]
  status         varchar(10) not null default 'available',
  image          varchar(500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint properties_type_check      check (property_type in ('Apartment','Villa','Row house','Penthouse','Plot')),
  constraint properties_status_check    check (status in ('available','sold','hold')),
  constraint properties_furnishing_check check (furnishing is null or furnishing in ('Unfurnished','Semi-furnished','Fully furnished')),
  constraint properties_price_check     check (price_lakh > 0),
  constraint properties_rooms_check     check (beds >= 0 and baths >= 0),
  constraint properties_bhk_check       check (bhk is null or bhk >= 0),
  constraint properties_area_check      check (area_sqft is null or area_sqft > 0)
);
create index if not exists ix_properties_project_id on public.properties (project_id);

-- Only the FastAPI backend touches these tables (it connects with DATABASE_URL as a role that bypasses
-- RLS). Enabling RLS with no policies blocks direct access through Supabase's public API / anon key.
alter table public.projects   enable row level security;
alter table public.properties enable row level security;

-- --------------------------------------------------------------- seed data
-- The 6 projects and 6 properties from the previous mock catalog (images are /images/<slug>.jpg,
-- served by the frontends). created_at is staggered so the list keeps this order.
insert into public.projects (id, name, city, locality, status, features, total_units, available_units, description, image, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'Skyline Heights', 'Nashik', 'Gangapur Road', 'Under construction',
   '["Clubhouse","Gym","Covered parking","Kids'' play area"]', 48, 12, null, '/images/skyline-heights.jpg', now() + interval '1 second', now() + interval '1 second'),
  ('00000000-0000-4000-8000-0000000000a2', 'Lake Vista', 'Nashik', 'Indira Nagar', 'Ready to move',
   '["Lake view","Gym","Power backup"]', 60, 8, null, '/images/lake-vista.jpg', now() + interval '2 seconds', now() + interval '2 seconds'),
  ('00000000-0000-4000-8000-0000000000a3', 'Riverside Park', 'Nashik', 'Panchavati', 'Under construction',
   '["Riverfront","Clubhouse","Swimming pool"]', 90, 40, null, '/images/riverside-park.jpg', now() + interval '3 seconds', now() + interval '3 seconds'),
  ('00000000-0000-4000-8000-0000000000a4', 'Hill Crest', 'Nashik', 'Deolali Camp', 'Ready to move',
   '["Hill view","Power backup"]', 44, 3, null, '/images/hill-crest.jpg', now() + interval '4 seconds', now() + interval '4 seconds'),
  ('00000000-0000-4000-8000-0000000000a5', 'Baner Greens', 'Pune', 'Baner', 'Under construction',
   '["Clubhouse","Gym","Co-working lounge"]', 80, 22, null, '/images/baner-greens.jpg', now() + interval '5 seconds', now() + interval '5 seconds'),
  ('00000000-0000-4000-8000-0000000000a6', 'Kharadi Vista', 'Pune', 'Kharadi', 'Ready to move',
   '["Riverside","Clubhouse","Kids'' play area"]', 64, 9, null, '/images/kharadi-vista.jpg', now() + interval '6 seconds', now() + interval '6 seconds')
on conflict (id) do nothing;

insert into public.properties (id, project_id, property_type, bhk, price_lakh, area_sqft, furnishing, beds, baths, tags, status, image, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'Apartment', 2,  65, 1050, 'Unfurnished',    2, 2, '["Covered parking","Gym"]',                'available', null, now() + interval '1 second', now() + interval '1 second'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a1', 'Apartment', 3, 110, 1350, 'Unfurnished',    3, 3, '["Clubhouse","Corner unit"]',              'available', null, now() + interval '2 seconds', now() + interval '2 seconds'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000a5', 'Apartment', 2,  92, 1050, 'Unfurnished',    2, 2, '["Co-working lounge","East-facing"]',      'available', null, now() + interval '3 seconds', now() + interval '3 seconds'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000a2', 'Apartment', 2,  72, 1050, 'Semi-furnished', 2, 2, '["Lake view"]',                          'available', null, now() + interval '4 seconds', now() + interval '4 seconds'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-0000000000a6', 'Apartment', 3, 130, 1350, 'Unfurnished',    3, 3, '["Riverside","Kids'' play area"]',         'available', null, now() + interval '5 seconds', now() + interval '5 seconds'),
  ('00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000a3', 'Apartment', 2,  60, 1050, 'Unfurnished',    2, 2, '["Riverfront","Pool access"]',             'available', null, now() + interval '6 seconds', now() + interval '6 seconds')
on conflict (id) do nothing;

commit;

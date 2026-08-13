-- Stratum Real Estate Group — Supabase schema
-- Run this once in Supabase Studio: SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to re-run: everything uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.

-- ============================================================
-- 1. properties table
-- ============================================================
create table if not exists public.properties (
  id                  text primary key,
  addr                text not null,
  city                text not null,
  full_addr           text generated always as (addr || ', ' || city) stored,
  price               text,
  orig_price          text,
  status              text not null default 'Active'
                        check (status in ('Active', 'Pending', 'Sold')),
  type                text not null default 'residential'
                        check (type in ('residential', 'land', 'business')),
  mls                 text,
  elev                text,
  beds                text,
  baths               text,
  sqft                text,
  lot                 text,
  subdivision         text,
  year_built          text,
  listed              text,
  blurb               text not null,
  public_remarks      text not null,
  facts               jsonb not null default '[]'::jsonb,   -- array of [label, value] pairs, order preserved
  rooms               text[] not null default '{}',          -- e.g. "Master Bedroom · Main"
  lat                 numeric,
  lng                 numeric,
  matterport_url      text,
  testimonial         text,
  testimonial_name    text,
  hero_photo_url      text,
  gallery_photo_urls  text[] not null default '{}',           -- up to 10, ordered
  video_url           text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;

drop policy if exists "properties_public_read" on public.properties;
create policy "properties_public_read"
  on public.properties for select
  to anon, authenticated
  using (true);

drop policy if exists "properties_admin_write" on public.properties;
create policy "properties_admin_write"
  on public.properties for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 2. qr_codes table (admin-only, nothing about it is public)
-- ============================================================
create table if not exists public.qr_codes (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  url         text not null,
  image_url   text,                 -- composited PNG (with optional logo) in Storage
  created_at  timestamptz not null default now()
);

alter table public.qr_codes enable row level security;

drop policy if exists "qr_codes_admin_only" on public.qr_codes;
create policy "qr_codes_admin_only"
  on public.qr_codes for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 3. Storage buckets
-- ============================================================
insert into storage.buckets (id, name, public)
values
  ('property-photos', 'property-photos', true),
  ('property-videos', 'property-videos', true),
  ('qr-codes', 'qr-codes', false)
on conflict (id) do nothing;

drop policy if exists "property_media_public_read" on storage.objects;
create policy "property_media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('property-photos', 'property-videos'));

drop policy if exists "property_media_admin_write" on storage.objects;
create policy "property_media_admin_write"
  on storage.objects for all
  to authenticated
  using (bucket_id in ('property-photos', 'property-videos'))
  with check (bucket_id in ('property-photos', 'property-videos'));

drop policy if exists "qr_codes_bucket_admin_only" on storage.objects;
create policy "qr_codes_bucket_admin_only"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'qr-codes')
  with check (bucket_id = 'qr-codes');

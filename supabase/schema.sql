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

-- ============================================================
-- 4. testimonials table — rotates on the homepage, full grid on /scott
-- ============================================================
create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  client_name  text not null,
  quote        text not null,
  property_id  text references public.properties(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Ordering by this groups similarly-sized quotes together wherever
-- testimonials are displayed, so a grid row never pairs one long card with
-- two short ones.
alter table public.testimonials add column if not exists quote_length int
  generated always as (char_length(quote)) stored;

alter table public.testimonials enable row level security;

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read"
  on public.testimonials for select
  to anon, authenticated
  using (true);

drop policy if exists "testimonials_admin_write" on public.testimonials;
create policy "testimonials_admin_write"
  on public.testimonials for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 5. site_settings — a single row of site-wide values: the /scott
--    marketing page's hero video and its editable text content
-- ============================================================
create table if not exists public.site_settings (
  id              int primary key default 1,
  scott_video_url text,
  home_video_url  text,
  constraint site_settings_singleton check (id = 1)
);

alter table public.site_settings add column if not exists home_video_url text;

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings add column if not exists scott_eyebrow text
  default 'Meet your agent';
alter table public.site_settings add column if not exists scott_heading text
  default 'Southern Utah real estate, done right.';
alter table public.site_settings add column if not exists scott_description text
  default 'I''m Scott Bird, a Cedar City & Brian Head realtor with Stratum Real Estate Group. Whether you''re buying your first home, selling a family property, or exploring land and investment opportunities, I bring local expertise, honest numbers, and a straightforward process from first call to closing day.';

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write"
  on public.site_settings for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 6. QR scan tracking + email notification
-- ============================================================
-- Every QR code the admin panel generates now encodes its target URL with a
-- hidden "?qr=<id>" tracking param. When someone scans it and lands on the
-- page, the site logs a row here. If a notification webhook URL is
-- configured below, a Postgres trigger calls it, which emails you via your
-- own Gmail (see setup steps in the comment above notify_qr_scan) — no
-- third-party service or new account, just a small script tied to the
-- Google account you already use.
create extension if not exists pg_net with schema extensions;

create table if not exists public.qr_scans (
  id          uuid primary key default gen_random_uuid(),
  qr_code_id  uuid references public.qr_codes(id) on delete set null,
  scanned_at  timestamptz not null default now(),
  lat         numeric,
  lng         numeric
);

alter table public.qr_scans add column if not exists lat numeric;
alter table public.qr_scans add column if not exists lng numeric;

alter table public.qr_scans enable row level security;

drop policy if exists "qr_scans_public_insert" on public.qr_scans;
create policy "qr_scans_public_insert"
  on public.qr_scans for insert
  to anon, authenticated
  with check (true);

drop policy if exists "qr_scans_admin_read" on public.qr_scans;
create policy "qr_scans_admin_read"
  on public.qr_scans for select
  to authenticated
  using (true);

drop policy if exists "qr_scans_admin_delete" on public.qr_scans;
create policy "qr_scans_admin_delete"
  on public.qr_scans for delete
  to authenticated
  using (true);

-- Small key/value config table. Holds the private "web app" URL of your
-- Google Apps Script (see below) so the notify function knows where to send
-- the scan alert.
create table if not exists public.app_config (
  key   text primary key,
  value text
);
insert into public.app_config (key, value) values ('notify_webhook_url', 'CHANGE-ME') on conflict (key) do nothing;

-- To turn on email notifications (no third-party account — this runs on
-- your own Google account):
--   1. Go to https://script.google.com, sign in with bird.scott@gmail.com,
--      click "New project".
--   2. Delete the placeholder code and paste this:
--
--        function doPost(e) {
--          var data = JSON.parse(e.postData.contents);
--          MailApp.sendEmail({
--            to: "bird.scott@gmail.com",
--            subject: "QR code scanned",
--            body: (data.label || "A QR code") + " was just scanned!"
--          });
--          return ContentService.createTextOutput("ok");
--        }
--
--   3. Click Deploy -> New deployment -> type "Web app". Set "Execute as"
--      to yourself, and "Who has access" to "Anyone" (this just means the
--      URL itself, which is long and effectively unguessable, is what
--      gates it — nobody without that exact link can trigger it).
--   4. Click Deploy, authorize it with your Google account, then copy the
--      Web app URL it gives you.
--   5. Run: update public.app_config set value = 'PASTE_URL_HERE' where key = 'notify_webhook_url';
--   6. Turn Gmail's mobile app notifications on (if not already) so the
--      email lands on your phone right away.
create or replace function public.notify_qr_scan()
returns trigger language plpgsql security definer as $$
declare
  qr_label text;
  hook_url text;
begin
  select label into qr_label from public.qr_codes where id = new.qr_code_id;
  select value into hook_url from public.app_config where key = 'notify_webhook_url';
  if hook_url is not null and hook_url <> 'CHANGE-ME' then
    perform net.http_post(
      url := hook_url,
      body := jsonb_build_object('label', coalesce(qr_label, 'A QR code'))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists qr_scans_notify on public.qr_scans;
create trigger qr_scans_notify
  after insert on public.qr_scans
  for each row execute function public.notify_qr_scan();

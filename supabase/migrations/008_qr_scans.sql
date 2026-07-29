-- ============================================================
-- GrOrbit — 008: QR scan tracking
-- Every customer-menu load records one scan row (?src= tells WHICH
-- printed QR was scanned: counter, entrance, parcel-pickup…).
-- ============================================================
create table if not exists public.qr_scans (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  src           text not null default 'direct',
  scanned_at    timestamptz not null default now()
);
create index if not exists idx_qr_scans on public.qr_scans(restaurant_id, scanned_at);

alter table public.qr_scans enable row level security;
create policy "anyone can record a scan" on public.qr_scans
  for insert with check (true);
create policy "owner reads scans" on public.qr_scans
  for select using (owns_restaurant(restaurant_id) or is_superadmin());

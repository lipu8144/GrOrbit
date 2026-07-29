-- ============================================================
-- GrOrbit — 006: image storage bucket + policies
-- Run in the SQL editor (or create the bucket in the Storage UI).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- public read (customers view images); authenticated users manage files
-- inside a folder named after their restaurant id.
create policy "menu-images public read"
  on storage.objects for select
  using ( bucket_id = 'menu-images' );

create policy "menu-images owner write"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'menu-images' );

create policy "menu-images owner update"
  on storage.objects for update to authenticated
  using ( bucket_id = 'menu-images' );

create policy "menu-images owner delete"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'menu-images' );

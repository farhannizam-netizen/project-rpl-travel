alter table public.content_items
  add column if not exists archived_by text;

create index if not exists content_items_archive_idx
  on public.content_items (section, deleted_at desc);

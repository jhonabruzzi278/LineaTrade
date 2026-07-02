-- Imágenes del Trade (Storage)
create type trade_image_stage as enum ('before', 'during', 'after');

create table public.trade_images (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references public.trades(id) on delete cascade,
  stage        trade_image_stage not null,
  storage_path text not null, -- path dentro del bucket, no la URL completa
  created_at   timestamptz not null default now()
);

create index idx_trade_images_trade on public.trade_images(trade_id);

alter table public.trade_images enable row level security;
create policy "trade_images_owner_all" on public.trade_images
  for all using (
    exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid())
  );

-- Storage bucket "trade-images" (privado, no público)
insert into storage.buckets (id, name, public)
values ('trade-images', 'trade-images', false)
on conflict (id) do nothing;

-- Política de Storage: cada usuario solo accede a objetos bajo su propio user_id/
-- Convención de path: {user_id}/{trade_id}/{stage}_{filename}
create policy "trade_images_storage_owner"
  on storage.objects for all
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = auth.uid()::text);

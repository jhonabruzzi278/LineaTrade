-- Storage bucket "avatars" (público a diferencia de "trade-images") — la foto de
-- perfil se muestra en el header de cada página autenticada, así que necesita una
-- URL estable sin firmar (una signed URL habría significado una llamada extra a
-- Storage en cada render del header, en cada página).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Cada usuario solo puede escribir dentro de su propia carpeta. La lectura pública
-- no pasa por esta policy (el bucket público sirve objetos vía el endpoint público,
-- sin evaluar RLS) — esta policy solo protege insert/update/delete.
-- Convención de path: {user_id}/avatar (sin extensión, un solo archivo por usuario,
-- se sobrescribe con upsert en cada subida nueva).
create policy "avatars_storage_owner_write"
  on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

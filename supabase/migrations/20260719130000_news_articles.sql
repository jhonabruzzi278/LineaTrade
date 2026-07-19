-- Feed de noticias de trading (sección "Noticias"). Datos globales agregados por
-- RSS server-side, no propiedad de ningún usuario -- por eso no hay user_id ni
-- policy owner_all como en el resto de tablas. Solo lectura para authenticated;
-- la escritura ocurre exclusivamente desde la Edge Function fetch-news, que usa
-- service_role (bypassa RLS por completo, no necesita policy de insert). Mismo
-- criterio que ai_analysis/trade_history: GRANT amplio + ausencia deliberada de
-- policy de insert/update/delete es lo que realmente bloquea la escritura desde
-- el cliente (ver 20260701223500_grant_authenticated_privileges.sql).
create table public.news_articles (
  id            uuid primary key default gen_random_uuid(),
  source_name   text not null,
  category      text not null check (category in ('acciones', 'forex', 'cripto', 'futuros', 'otro', 'general')),
  title         text not null,
  url           text not null unique,
  summary       text,
  image_url     text,
  published_at  timestamptz not null,
  fetched_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index idx_news_articles_category on public.news_articles(category, published_at desc);
create index idx_news_articles_published on public.news_articles(published_at desc);

alter table public.news_articles enable row level security;
create policy "news_articles_select_authenticated" on public.news_articles
  for select using (auth.uid() is not null);

grant select, insert, update, delete on public.news_articles to authenticated;

-- Cuerpo (excerpt) de artículos de noticias, separado de news_articles para
-- que los listados de /noticias (limit 120) sigan siendo livianos. Solo se
-- carga lazy al abrir /noticias/:id. La política de licencias se documenta
-- por fuente en el Edge Function fetch-article-body (2 tiers:
-- fair-use-reprint, rss-snippet-only — deliberadamente sin un tier de
-- "cuerpo completo", ver el comentario de LicenseTier en
-- supabase/functions/_shared/newsTypes.ts) y se persiste acá para que el
-- frontend sepa cómo renderizar el contenido y si el CTA externo sigue
-- siendo obligatorio (siempre lo es).
--
-- Sólo texto plano (body_text) — nunca HTML del sitio scrapeado. El
-- contenido de un tercero no confiable nunca debe llegar a
-- dangerouslySetInnerHTML en el frontend, así que no hay razón para
-- persistir HTML acá.
--
-- RLS: select para authenticated (lectura desde la app), insert/update solo
-- via service_role (la Edge Function es la única escritora). Mismo patrón
-- que news_articles: GRANT amplio + ausencia deliberada de policy de
-- insert/update/delete es lo que bloquea la escritura desde el cliente.
create table public.news_article_body (
  article_id        uuid primary key references public.news_articles(id) on delete cascade,
  body_text         text,
  word_count        integer,
  content_license   text not null check (content_license in ('fair-use-reprint', 'rss-snippet-only')),
  source_url        text not null,
  fetched_at        timestamptz not null default now()
);

create index idx_news_article_body_fetched on public.news_article_body(fetched_at);

alter table public.news_article_body enable row level security;
create policy "news_body_select_authenticated" on public.news_article_body
  for select using (auth.uid() is not null);

grant select on public.news_article_body to authenticated;
grant select, insert, update on public.news_article_body to service_role;

comment on table public.news_article_body is 'Excerpt de artículos de noticias (lazy, con tier de licencia, siempre texto plano)';

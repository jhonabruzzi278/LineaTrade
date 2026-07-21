-- Fuerza a PostgREST a recargar su schema cache para que news_article_body
-- sea visible via REST (mismo workaround que 20260719173629 para news_articles).
alter table public.news_article_body owner to postgres;
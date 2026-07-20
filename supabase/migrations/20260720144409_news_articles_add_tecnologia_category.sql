-- Agrega 'tecnologia' como categoría válida de news_articles — nuevas fuentes de tech
-- (Xataka, Hipertextual) no encajan en ninguna de las categorías existentes
-- (acciones/forex/cripto/futuros/otro/general). check constraints no soportan "alter",
-- hay que dropearlo y recrearlo con el valor nuevo.
alter table public.news_articles drop constraint news_articles_category_check;
alter table public.news_articles add constraint news_articles_category_check
  check (category in ('acciones', 'forex', 'cripto', 'futuros', 'tecnologia', 'otro', 'general'));

-- Coach conversacional (Fase 6) — la pieza más nueva del plan: sin precedente de chat
-- en este proyecto. Dos tablas: una conversación es un hilo, un mensaje pertenece a un
-- hilo. user_id denormalizado en ai_coach_messages, mismo patrón ya establecido para
-- trade_orders/trade_threads/trade_confluences (evita un join solo para resolver el
-- dueño en cada policy).
create table public.ai_coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_coach_conversations enable row level security;

create policy ai_coach_conversations_owner_all on public.ai_coach_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.ai_coach_conversations to authenticated;

create table public.ai_coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_coach_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  -- Cap de 4000 chars — límite de validación en el boundary real (insert vía RLS
  -- directo del cliente, no pasa por el Edge Function). Bug real encontrado en
  -- auditoría 2026-07-29: no había ningún límite de longitud en ningún punto del
  -- camino (ni el <textarea>, ni sendUserMessage, ni el schema de zod del Edge
  -- Function, que solo valida conversation_id) — a diferencia de cada otra superficie
  -- de entrada a IA en este repo (extract-trade-image cap 5MB, detect-confluences
  -- max(60)). ~1000 tokens es generoso para una pregunta de chat real.
  content text not null check (char_length(content) <= 4000),
  -- Solo poblado en mensajes role='assistant', mismo mecanismo que ai_analysis/
  -- ai_insights (facts_cited validado contra el contexto antes de insertar).
  facts_cited jsonb,
  created_at timestamptz not null default now()
);

create index idx_ai_coach_messages_conversation on public.ai_coach_messages(conversation_id, created_at);

alter table public.ai_coach_messages enable row level security;

create policy ai_coach_messages_select_own on public.ai_coach_messages
  for select using (user_id = auth.uid());

-- El cliente solo puede insertar SUS PROPIOS mensajes (role='user') — una respuesta
-- role='assistant' únicamente la inserta ai-coach-chat con service_role, después de
-- validar facts_cited contra el contexto real. Mismo criterio "insert-only vía Edge
-- Function" que ya rige ai_analysis/ai_insights: ningún mensaje "de la IA" llega a la
-- tabla sin pasar por la validación anti-alucinación.
create policy ai_coach_messages_insert_user_role on public.ai_coach_messages
  for insert with check (user_id = auth.uid() and role = 'user');

grant select, insert on public.ai_coach_messages to authenticated;
grant select, insert on public.ai_coach_messages to service_role;

-- ai-coach-chat bumps ai_coach_conversations.updated_at con service_role después de
-- insertar la respuesta (para que la lista de conversaciones ordene por "más
-- reciente") — sin este grant esa UPDATE fallaba en silencio con "permission denied",
-- mismo bug class que CLAUDE.md documenta para news_articles/trades (RLS no alcanza
-- sin el GRANT explícito, Postgres nunca lo auto-otorga a service_role).
grant select, insert, update on public.ai_coach_conversations to service_role;

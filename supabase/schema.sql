-- ═══════════════════════════════════════════════════════════════
-- Clube de Xadrez — schema do Supabase
-- Rode este script inteiro no SQL Editor do seu projeto Supabase
-- (Painel → SQL Editor → New query → colar → Run).
-- Pode rodar de novo sem problema: usa "if not exists" / "or replace".
-- ═══════════════════════════════════════════════════════════════

-- ── NÚCLEOS ──
create table if not exists public.nucleos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  endereco text default '',
  observacoes text default '',
  created_at timestamptz not null default now()
);

-- ── PROFESSORES ──
create table if not exists public.professores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  nivel text not null default 'professor',
  peso numeric not null default 1.5,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── RESPONSÁVEIS ──
create table if not exists public.responsaveis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text default '',
  email text default '',
  observacoes text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── ALUNOS ──
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text default '',
  responsavel_id uuid references public.responsaveis(id) on delete set null,
  valor_padrao numeric not null default 15,
  observacoes text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── AULAS ──
-- professores/alunos ficam em JSONB (mesmo formato usado no app) porque
-- são "fotografias" da aula: peso do professor e valor pago do aluno
-- congelados no momento do registro, sem depender do cadastro atual.
create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  nucleo_id uuid references public.nucleos(id) on delete set null,
  professores jsonb not null default '[]'::jsonb,
  alunos jsonb not null default '[]'::jsonb,
  observacoes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── CONFIGURAÇÕES DO APP ──
-- Linha única (id fixo) com opções globais, lida ANTES do login (a tela de
-- login precisa saber se deve oferecer "Criar conta"), por isso não tem
-- user_id nem fica atrás de RLS de dono.
create table if not exists public.app_settings (
  id boolean primary key default true, -- sempre 'true', garante 1 única linha
  permitir_cadastro boolean not null default true,
  cache_ttl_minutos integer not null default 30,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = true)
);

-- coluna nova pra quem já tinha rodado o schema antes de existir cache
alter table public.app_settings add column if not exists cache_ttl_minutos integer not null default 30;

insert into public.app_settings (id, permitir_cadastro, cache_ttl_minutos)
values (true, true, 30)
on conflict (id) do nothing;

-- Índices úteis
create index if not exists idx_aulas_user_data on public.aulas (user_id, data desc);
create index if not exists idx_alunos_user on public.alunos (user_id);
create index if not exists idx_professores_user on public.professores (user_id);
create index if not exists idx_nucleos_user on public.nucleos (user_id);
create index if not exists idx_responsaveis_user on public.responsaveis (user_id);

-- ── updated_at automático em aulas ──
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_aulas_updated_at on public.aulas;
create trigger trg_aulas_updated_at
  before update on public.aulas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — cada usuário só vê/edita os próprios dados
-- ═══════════════════════════════════════════════════════════════

alter table public.nucleos enable row level security;
alter table public.professores enable row level security;
alter table public.responsaveis enable row level security;
alter table public.alunos enable row level security;
alter table public.aulas enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "nucleos_owner" on public.nucleos;
create policy "nucleos_owner" on public.nucleos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "professores_owner" on public.professores;
create policy "professores_owner" on public.professores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "responsaveis_owner" on public.responsaveis;
create policy "responsaveis_owner" on public.responsaveis
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "alunos_owner" on public.alunos;
create policy "alunos_owner" on public.alunos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "aulas_owner" on public.aulas;
create policy "aulas_owner" on public.aulas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- app_settings: qualquer um (mesmo deslogado) pode LER — a tela de login
-- precisa saber se deve oferecer "Criar conta" antes de autenticar.
-- Só usuários autenticados podem alterar.
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (true);

drop policy if exists "app_settings_update_authenticated" on public.app_settings;
create policy "app_settings_update_authenticated" on public.app_settings
  for update using (auth.uid() is not null) with check (auth.uid() is not null);

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
  forma_cobranca text not null default 'porAula',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- coluna nova pra quem já tinha rodado o schema antes de existir mensalidade
-- ('porAula' = cobra ao final do mês pelas aulas frequentadas, modelo
-- original; 'mensalidade' = aluno paga um valor fixo adiantado por mês,
-- ex: núcleo Maple Bear)
alter table public.nucleos add column if not exists forma_cobranca text not null default 'porAula';
do $$ begin
  alter table public.nucleos add constraint nucleos_forma_cobranca_check check (forma_cobranca in ('porAula', 'mensalidade'));
exception when duplicate_object then null;
end $$;

-- coluna nova pra quem já tinha rodado o schema antes de existir desativação de núcleo
alter table public.nucleos add column if not exists ativo boolean not null default true;

-- grade de horários oferecidos pelo núcleo (só relevante p/ mensalidade),
-- ex: ["08:00-09:00", "09:00-10:00", ...] — cada Turma usa um desses horários
alter table public.nucleos add column if not exists horarios jsonb not null default '[]'::jsonb;

-- ── TURMAS ──
-- Horário fixo semanal de um núcleo de mensalidade (dia da semana + horário).
-- Cada aluno de mensalidade se matricula numa turma; ao registrar uma aula,
-- a turma escolhida filtra quais alunos aparecem pra marcar presença.
create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  dia_semana text not null,
  horario text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
do $$ begin
  alter table public.turmas add constraint turmas_dia_semana_check check (dia_semana in ('domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'));
exception when duplicate_object then null;
end $$;

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

-- colunas novas pra registrar pai e mãe separadamente no mesmo responsável
-- (cada um com nome/telefone/email); as colunas antigas (nome/telefone/email)
-- ficam como legado e não são mais usadas pelo app.
alter table public.responsaveis add column if not exists nome_pai text default '';
alter table public.responsaveis add column if not exists telefone_pai text default '';
alter table public.responsaveis add column if not exists email_pai text default '';
alter table public.responsaveis add column if not exists nome_mae text default '';
alter table public.responsaveis add column if not exists telefone_mae text default '';
alter table public.responsaveis add column if not exists email_mae text default '';

-- migra o contato antigo (que não se sabia se era pai ou mãe) para "pai",
-- só na primeira vez (enquanto nome_pai ainda estiver vazio)
update public.responsaveis
  set nome_pai = nome, telefone_pai = coalesce(telefone, ''), email_pai = coalesce(email, '')
  where coalesce(nome_pai, '') = '' and coalesce(nome, '') <> '';

-- "nome" deixa de ser obrigatório: o app agora só grava nome_pai/nome_mae
alter table public.responsaveis alter column nome drop not null;
alter table public.responsaveis alter column nome set default '';

-- ── ALUNOS ──
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text default '',
  responsavel_id uuid references public.responsaveis(id) on delete set null,
  nucleo_id uuid references public.nucleos(id) on delete set null,
  valor_padrao numeric not null default 15,
  valor_mensalidade numeric not null default 0,
  observacoes text default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- colunas novas pra quem já tinha rodado o schema antes de existir mensalidade.
-- nucleo_id = núcleo "de matrícula" do aluno, usado só para saber onde gerar
-- a cobrança de mensalidade (não limita em quais núcleos ele pode ter aulas).
alter table public.alunos add column if not exists nucleo_id uuid references public.nucleos(id) on delete set null;
alter table public.alunos add column if not exists valor_mensalidade numeric not null default 0;

-- dia da semana da aula fixa do aluno — coluna antiga, substituída por
-- turma_id (turma = dia + horário); fica como legado, não é mais usada.
alter table public.alunos add column if not exists dia_semana text;

-- turma (dia + horário fixo semanal) em que o aluno está matriculado —
-- só relevante em núcleos de mensalidade
alter table public.alunos add column if not exists turma_id uuid references public.turmas(id) on delete set null;

-- ── MENSALIDADES ──
-- Cobrança mensal adiantada, usada pelos núcleos com forma_cobranca =
-- 'mensalidade'. Independe de presença/aula: é gerada no início do mês pro
-- aluno matriculado naquele núcleo e marcada como paga quando o responsável
-- quitar. O valor consolidado do mês entra no rateio dos professores
-- (ver lib/reports.ts), dividido igualmente entre as aulas do mês.
create table if not exists public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  nucleo_id uuid not null references public.nucleos(id) on delete cascade,
  ano integer not null,
  mes integer not null, -- 0-indexado (0 = janeiro), igual ao Date do JS
  valor numeric not null default 0,
  pago boolean not null default false,
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mensalidades_unica unique (aluno_id, nucleo_id, ano, mes)
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

-- turma escolhida ao registrar a aula (só relevante p/ núcleos de mensalidade)
alter table public.aulas add column if not exists turma_id uuid references public.turmas(id) on delete set null;

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
create index if not exists idx_mensalidades_nucleo_mes on public.mensalidades (nucleo_id, ano, mes);
create index if not exists idx_mensalidades_aluno on public.mensalidades (aluno_id);
create index if not exists idx_turmas_user on public.turmas (user_id);
create index if not exists idx_turmas_nucleo on public.turmas (nucleo_id);

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

drop trigger if exists trg_mensalidades_updated_at on public.mensalidades;
create trigger trg_mensalidades_updated_at
  before update on public.mensalidades
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — app de equipe: qualquer usuário autenticado
-- vê e edita os dados de todo mundo (dados compartilhados do time,
-- não isolados por dono). user_id continua gravado em cada registro
-- só como registro de quem criou (auditoria), não é mais usado para
-- restringir acesso.
-- ═══════════════════════════════════════════════════════════════

alter table public.nucleos enable row level security;
alter table public.professores enable row level security;
alter table public.responsaveis enable row level security;
alter table public.alunos enable row level security;
alter table public.aulas enable row level security;
alter table public.app_settings enable row level security;
alter table public.mensalidades enable row level security;
alter table public.turmas enable row level security;

drop policy if exists "nucleos_owner" on public.nucleos;
drop policy if exists "nucleos_team" on public.nucleos;
create policy "nucleos_team" on public.nucleos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "professores_owner" on public.professores;
drop policy if exists "professores_team" on public.professores;
create policy "professores_team" on public.professores
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "responsaveis_owner" on public.responsaveis;
drop policy if exists "responsaveis_team" on public.responsaveis;
create policy "responsaveis_team" on public.responsaveis
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "alunos_owner" on public.alunos;
drop policy if exists "alunos_team" on public.alunos;
create policy "alunos_team" on public.alunos
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "aulas_owner" on public.aulas;
drop policy if exists "aulas_team" on public.aulas;
create policy "aulas_team" on public.aulas
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "mensalidades_team" on public.mensalidades;
create policy "mensalidades_team" on public.mensalidades
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "turmas_team" on public.turmas;
create policy "turmas_team" on public.turmas
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- app_settings: qualquer um (mesmo deslogado) pode LER — a tela de login
-- precisa saber se deve oferecer "Criar conta" antes de autenticar.
-- Só usuários autenticados podem alterar.
drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all" on public.app_settings
  for select using (true);

drop policy if exists "app_settings_update_authenticated" on public.app_settings;
create policy "app_settings_update_authenticated" on public.app_settings
  for update using (auth.uid() is not null) with check (auth.uid() is not null);

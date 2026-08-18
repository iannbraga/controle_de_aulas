// Formato das linhas como vêm do Supabase (snake_case) — espelha supabase/schema.sql.

export interface NucleoRow {
  id: string;
  user_id: string;
  nome: string;
  endereco: string | null;
  observacoes: string | null;
  forma_cobranca: string;
  horarios: string[] | null;
  ativo: boolean;
  created_at: string;
}

export interface TurmaRow {
  id: string;
  user_id: string;
  nucleo_id: string;
  dia_semana: string;
  horario: string;
  ativo: boolean;
  created_at: string;
}

export interface ProfessorRow {
  id: string;
  user_id: string;
  nome: string;
  nivel: string;
  peso: number;
  ativo: boolean;
  created_at: string;
}

export interface ResponsavelRow {
  id: string;
  user_id: string;
  nome_pai: string | null;
  telefone_pai: string | null;
  email_pai: string | null;
  nome_mae: string | null;
  telefone_mae: string | null;
  email_mae: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface AlunoRow {
  id: string;
  user_id: string;
  nome: string;
  telefone: string | null;
  responsavel_id: string | null;
  nucleo_id: string | null;
  valor_padrao: number;
  valor_mensalidade: number;
  turma_id: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface AulaRow {
  id: string;
  user_id: string;
  data: string;
  nucleo_id: string | null;
  turma_id: string | null;
  professores: unknown; // AulaProfessor[]
  alunos: unknown; // AulaAluno[]
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MensalidadeRow {
  id: string;
  user_id: string;
  aluno_id: string;
  nucleo_id: string;
  ano: number;
  mes: number;
  valor: number;
  pago: boolean;
  data_pagamento: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: true;
  permitir_cadastro: boolean;
  cache_ttl_minutos: number;
  updated_at: string;
}

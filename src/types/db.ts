// Formato das linhas como vêm do Supabase (snake_case) — espelha supabase/schema.sql.

export interface NucleoRow {
  id: string;
  user_id: string;
  nome: string;
  endereco: string | null;
  observacoes: string | null;
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
  nome: string;
  telefone: string | null;
  email: string | null;
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
  valor_padrao: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
}

export interface AulaRow {
  id: string;
  user_id: string;
  data: string;
  nucleo_id: string | null;
  professores: unknown; // AulaProfessor[]
  alunos: unknown; // AulaAluno[]
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: true;
  permitir_cadastro: boolean;
  cache_ttl_minutos: number;
  updated_at: string;
}

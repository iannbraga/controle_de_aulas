// Tipos do domínio — espelham exatamente o formato salvo no localStorage
// (chave 'xadrez-v2'), para manter compatibilidade com os backups existentes.

export type NivelProfessor = 'principal' | 'professor' | 'auxiliar' | 'trainee' | 'observador';

export interface Professor {
  id: string;
  nome: string;
  nivel: NivelProfessor;
  peso: number;
  ativo: boolean;
}

export interface Responsavel {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  ativo: boolean;
}

export interface Aluno {
  id: string;
  nome: string;
  telefone: string;
  responsavelId: string;
  valorPadrao: number;
  observacoes: string;
  ativo: boolean;
}

export interface Nucleo {
  id: string;
  nome: string;
  endereco: string;
  observacoes: string;
}

export interface AulaProfessor {
  professorId: string;
  pesoAplicado: number;
}

export interface AulaAluno {
  alunoId: string;
  valorPago: number;
  presente: boolean;
  pago: boolean;
}

export interface Aula {
  id: string;
  data: string; // yyyy-mm-dd
  nucleoId: string;
  professores: AulaProfessor[];
  alunos: AulaAluno[];
  observacoes: string;
}

export interface Backup {
  professores: Professor[];
  alunos: Aluno[];
  nucleos: Nucleo[];
  aulas: Aula[];
  responsaveis: Responsavel[];
}

// ── Tipos auxiliares usados por telas/derivações ──

export interface MonthRef {
  year: number;
  month: number; // 0-indexed, igual ao Date do JS
}

export interface PendenciaItem {
  aulaId: string;
  data: string;
  nucleoId: string;
  valor: number;
}

export interface PendenciaAluno {
  alunoId: string;
  nome: string;
  responsavel: string | null;
  responsavelTel: string | null;
  aulas: PendenciaItem[];
  total: number;
}

export interface GrupoPorNucleo {
  nucleoId: string;
  nome: string;
  aulas: Aula[];
  total: number;
}

export interface FinPorNucleo {
  nucleoId: string;
  nome: string;
  total: number;
  numAulas: number;
  numPresencas: number;
}

export interface FechamentoNucleoDetalhe {
  nucleoId: string;
  nome: string;
  valor: number;
  numAulas: number;
  cor: string;
}

export interface FechamentoProfessor {
  profId: string;
  nome: string;
  total: number;
  numAulas: number;
  pesoTotal: number;
  pesoMedio: number;
  porNucleo: FechamentoNucleoDetalhe[];
}

// Tipos do domínio — espelham exatamente o formato salvo no localStorage
// (chave 'xadrez-v2'), para manter compatibilidade com os backups existentes.

export type NivelProfessor = 'principal' | 'professor' | 'auxiliar' | 'trainee' | 'observador';

// 'porAula' = cobra ao final do mês pelas aulas frequentadas (modelo original);
// 'mensalidade' = aluno paga um valor fixo adiantado por mês (ex: Maple Bear).
export type FormaCobranca = 'porAula' | 'mensalidade';

// Dia da semana da aula fixa do aluno (usado em núcleos de mensalidade, onde
// o aluno tem 1 aula fixa de 1h por semana, ex: toda segunda ou toda quinta).
export type DiaSemana = 'domingo' | 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado';

export interface Professor {
  id: string;
  nome: string;
  nivel: NivelProfessor;
  peso: number;
  ativo: boolean;
}

export interface Responsavel {
  id: string;
  nomePai: string;
  telefonePai: string;
  emailPai: string;
  nomeMae: string;
  telefoneMae: string;
  emailMae: string;
  observacoes: string;
  ativo: boolean;
}

export interface Aluno {
  id: string;
  nome: string;
  telefone: string;
  responsavelId: string;
  nucleoId: string; // núcleo de matrícula (usado pra gerar a mensalidade dele)
  valorPadrao: number;
  valorMensalidade: number;
  turmaId: string; // turma (dia + horário fixo) — só usado em núcleos de mensalidade
  observacoes: string;
  ativo: boolean;
}

export interface Nucleo {
  id: string;
  nome: string;
  endereco: string;
  observacoes: string;
  formaCobranca: FormaCobranca;
  horarios: string[]; // grade de horários oferecidos (ex: "08:00-09:00") — só relevante p/ mensalidade
  ativo: boolean;
}

// Turma = horário fixo semanal de um núcleo de mensalidade (dia da semana +
// horário). Cada aluno de mensalidade se matricula numa turma; ao registrar
// uma aula, a turma escolhida filtra quais alunos aparecem pra marcar presença.
export interface Turma {
  id: string;
  nucleoId: string;
  diaSemana: DiaSemana;
  horario: string; // ex: "08:00-09:00", deve bater com um dos Nucleo.horarios
  ativo: boolean;
}

export interface Mensalidade {
  id: string;
  alunoId: string;
  nucleoId: string;
  ano: number;
  mes: number; // 0-indexado, igual ao Date do JS
  valor: number;
  pago: boolean;
  dataPagamento: string | null;
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
  turmaId: string; // turma escolhida (só relevante p/ núcleos de mensalidade)
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
  mensalidades?: Mensalidade[];
  turmas?: Turma[];
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

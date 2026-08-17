// Conversão entre o formato do banco (snake_case, ids uuid) e os tipos do
// domínio da aplicação (camelCase) — mantém o resto do app (stores, views,
// modais) exatamente como estava antes do Supabase.

import type { NucleoRow, ProfessorRow, ResponsavelRow, AlunoRow, AulaRow } from '../types/db';
import type { Nucleo, Professor, Responsavel, Aluno, Aula, AulaProfessor, AulaAluno } from '../types/domain';

export function nucleoFromRow(r: NucleoRow): Nucleo {
  return { id: r.id, nome: r.nome, endereco: r.endereco ?? '', observacoes: r.observacoes ?? '' };
}
export function nucleoToRow(n: Nucleo) {
  return { nome: n.nome, endereco: n.endereco, observacoes: n.observacoes };
}

export function professorFromRow(r: ProfessorRow): Professor {
  return { id: r.id, nome: r.nome, nivel: r.nivel as Professor['nivel'], peso: r.peso, ativo: r.ativo };
}
export function professorToRow(p: Professor) {
  return { nome: p.nome, nivel: p.nivel, peso: p.peso, ativo: p.ativo };
}

export function responsavelFromRow(r: ResponsavelRow): Responsavel {
  return { id: r.id, nome: r.nome, telefone: r.telefone ?? '', email: r.email ?? '', observacoes: r.observacoes ?? '', ativo: r.ativo };
}
export function responsavelToRow(r: Responsavel) {
  return { nome: r.nome, telefone: r.telefone, email: r.email, observacoes: r.observacoes, ativo: r.ativo };
}

export function alunoFromRow(r: AlunoRow): Aluno {
  return {
    id: r.id, nome: r.nome, telefone: r.telefone ?? '', responsavelId: r.responsavel_id ?? '',
    valorPadrao: r.valor_padrao, observacoes: r.observacoes ?? '', ativo: r.ativo,
  };
}
export function alunoToRow(a: Aluno) {
  return {
    nome: a.nome, telefone: a.telefone, responsavel_id: a.responsavelId || null,
    valor_padrao: a.valorPadrao, observacoes: a.observacoes, ativo: a.ativo,
  };
}

export function aulaFromRow(r: AulaRow): Aula {
  return {
    id: r.id, data: r.data, nucleoId: r.nucleo_id ?? '',
    professores: (r.professores as AulaProfessor[]) ?? [],
    alunos: (r.alunos as AulaAluno[]) ?? [],
    observacoes: r.observacoes ?? '',
  };
}
export function aulaToRow(a: Aula) {
  return {
    data: a.data, nucleo_id: a.nucleoId || null,
    professores: a.professores, alunos: a.alunos, observacoes: a.observacoes,
  };
}

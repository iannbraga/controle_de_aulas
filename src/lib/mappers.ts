// Conversão entre o formato do banco (snake_case, ids uuid) e os tipos do
// domínio da aplicação (camelCase) — mantém o resto do app (stores, views,
// modais) exatamente como estava antes do Supabase.

import type { NucleoRow, ProfessorRow, ResponsavelRow, AlunoRow, AulaRow, MensalidadeRow, TurmaRow } from '../types/db';
import type { Nucleo, Professor, Responsavel, Aluno, Aula, AulaProfessor, AulaAluno, Mensalidade, FormaCobranca, DiaSemana, Turma } from '../types/domain';

export function nucleoFromRow(r: NucleoRow): Nucleo {
  return {
    id: r.id, nome: r.nome, endereco: r.endereco ?? '', observacoes: r.observacoes ?? '',
    formaCobranca: (r.forma_cobranca as FormaCobranca) || 'porAula', horarios: r.horarios ?? [], ativo: r.ativo,
  };
}
export function nucleoToRow(n: Nucleo) {
  return {
    nome: n.nome, endereco: n.endereco, observacoes: n.observacoes, forma_cobranca: n.formaCobranca || 'porAula',
    horarios: n.horarios ?? [], ativo: n.ativo,
  };
}

export function turmaFromRow(r: TurmaRow): Turma {
  return { id: r.id, nucleoId: r.nucleo_id, diaSemana: r.dia_semana as DiaSemana, horario: r.horario, ativo: r.ativo };
}
export function turmaToRow(t: Turma) {
  return { nucleo_id: t.nucleoId, dia_semana: t.diaSemana, horario: t.horario, ativo: t.ativo };
}

export function professorFromRow(r: ProfessorRow): Professor {
  return { id: r.id, nome: r.nome, nivel: r.nivel as Professor['nivel'], peso: r.peso, ativo: r.ativo };
}
export function professorToRow(p: Professor) {
  return { nome: p.nome, nivel: p.nivel, peso: p.peso, ativo: p.ativo };
}

export function responsavelFromRow(r: ResponsavelRow): Responsavel {
  return {
    id: r.id,
    nomePai: r.nome_pai ?? '', telefonePai: r.telefone_pai ?? '', emailPai: r.email_pai ?? '',
    nomeMae: r.nome_mae ?? '', telefoneMae: r.telefone_mae ?? '', emailMae: r.email_mae ?? '',
    observacoes: r.observacoes ?? '', ativo: r.ativo,
  };
}
export function responsavelToRow(r: Responsavel) {
  return {
    nome_pai: r.nomePai, telefone_pai: r.telefonePai, email_pai: r.emailPai,
    nome_mae: r.nomeMae, telefone_mae: r.telefoneMae, email_mae: r.emailMae,
    observacoes: r.observacoes, ativo: r.ativo,
  };
}

export function alunoFromRow(r: AlunoRow): Aluno {
  return {
    id: r.id, nome: r.nome, telefone: r.telefone ?? '', responsavelId: r.responsavel_id ?? '',
    nucleoId: r.nucleo_id ?? '', valorPadrao: r.valor_padrao, valorMensalidade: r.valor_mensalidade ?? 0,
    turmaId: r.turma_id ?? '',
    observacoes: r.observacoes ?? '', ativo: r.ativo,
  };
}
export function alunoToRow(a: Aluno) {
  return {
    nome: a.nome, telefone: a.telefone, responsavel_id: a.responsavelId || null,
    nucleo_id: a.nucleoId || null, valor_padrao: a.valorPadrao, valor_mensalidade: a.valorMensalidade || 0,
    turma_id: a.turmaId || null,
    observacoes: a.observacoes, ativo: a.ativo,
  };
}

export function mensalidadeFromRow(r: MensalidadeRow): Mensalidade {
  return {
    id: r.id, alunoId: r.aluno_id, nucleoId: r.nucleo_id, ano: r.ano, mes: r.mes,
    valor: r.valor, pago: r.pago, dataPagamento: r.data_pagamento,
  };
}
export function mensalidadeToRow(m: Mensalidade) {
  return {
    aluno_id: m.alunoId, nucleo_id: m.nucleoId, ano: m.ano, mes: m.mes,
    valor: m.valor, pago: m.pago, data_pagamento: m.dataPagamento,
  };
}

export function aulaFromRow(r: AulaRow): Aula {
  return {
    id: r.id, data: r.data, nucleoId: r.nucleo_id ?? '', turmaId: r.turma_id ?? '',
    professores: (r.professores as AulaProfessor[]) ?? [],
    alunos: (r.alunos as AulaAluno[]) ?? [],
    observacoes: r.observacoes ?? '',
  };
}
export function aulaToRow(a: Aula) {
  return {
    data: a.data, nucleo_id: a.nucleoId || null, turma_id: a.turmaId || null,
    professores: a.professores, alunos: a.alunos, observacoes: a.observacoes,
  };
}

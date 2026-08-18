// Importa um backup (formato Backup — o mesmo dos arquivos .json exportados
// pelo app, e também o formato salvo no localStorage pela versão anterior)
// para o Supabase do usuário logado. Os ids antigos (gerados localmente,
// tipo "m4x2a1b") não são uuid, então tudo é reinserido com novo id e as
// referências (responsavelId, nucleoId, professorId, alunoId) são remapeadas.

import type { Backup, Aula, AulaProfessor, AulaAluno } from '../types/domain';
import { supabase } from './supabase';
import { nucleoToRow, professorToRow, responsavelToRow, alunoToRow, turmaToRow } from './mappers';

export interface MigrationResult {
  nucleos: number;
  professores: number;
  alunos: number;
  responsaveis: number;
  aulas: number;
  mensalidades: number;
  turmas: number;
}

export async function importBackupToSupabase(backup: Partial<Backup>): Promise<MigrationResult> {
  const nucleoIdMap: Record<string, string> = {};
  const professorIdMap: Record<string, string> = {};
  const responsavelIdMap: Record<string, string> = {};
  const alunoIdMap: Record<string, string> = {};
  const turmaIdMap: Record<string, string> = {};

  // ── Núcleos ──
  for (const n of backup.nucleos ?? []) {
    const { data, error } = await supabase.from('nucleos').insert(nucleoToRow(n)).select('id').single();
    if (!error && data) nucleoIdMap[n.id] = data.id;
  }

  // ── Turmas (remapeando nucleo_id) ──
  for (const t of backup.turmas ?? []) {
    const nucleoId = nucleoIdMap[t.nucleoId];
    if (!nucleoId) continue; // referência quebrada no backup, ignora
    const row = { ...turmaToRow(t), nucleo_id: nucleoId };
    const { data, error } = await supabase.from('turmas').insert(row).select('id').single();
    if (!error && data) turmaIdMap[t.id] = data.id;
  }

  // ── Responsáveis ──
  for (const r of backup.responsaveis ?? []) {
    const { data, error } = await supabase.from('responsaveis').insert(responsavelToRow(r)).select('id').single();
    if (!error && data) responsavelIdMap[r.id] = data.id;
  }

  // ── Professores ──
  for (const p of backup.professores ?? []) {
    const { data, error } = await supabase.from('professores').insert(professorToRow(p)).select('id').single();
    if (!error && data) professorIdMap[p.id] = data.id;
  }

  // ── Alunos (remapeando responsavel_id, nucleo_id de matrícula e turma_id) ──
  for (const a of backup.alunos ?? []) {
    const row = alunoToRow(a);
    row.responsavel_id = a.responsavelId ? (responsavelIdMap[a.responsavelId] ?? null) : null;
    row.nucleo_id = a.nucleoId ? (nucleoIdMap[a.nucleoId] ?? null) : null;
    row.turma_id = a.turmaId ? (turmaIdMap[a.turmaId] ?? null) : null;
    const { data, error } = await supabase.from('alunos').insert(row).select('id').single();
    if (!error && data) alunoIdMap[a.id] = data.id;
  }

  // ── Aulas (remapeando nucleo_id, turma_id, professores[].professorId, alunos[].alunoId) ──
  let aulasCount = 0;
  for (const aula of backup.aulas ?? []) {
    const professoresRemapeados: AulaProfessor[] = aula.professores
      .filter(ap => professorIdMap[ap.professorId])
      .map(ap => ({ professorId: professorIdMap[ap.professorId], pesoAplicado: ap.pesoAplicado }));
    const alunosRemapeados: AulaAluno[] = aula.alunos
      .filter(aa => alunoIdMap[aa.alunoId])
      .map(aa => ({ alunoId: alunoIdMap[aa.alunoId], valorPago: aa.valorPago, presente: aa.presente, pago: aa.pago }));

    const aulaRemapeada: Aula = {
      id: aula.id,
      data: aula.data,
      nucleoId: aula.nucleoId ? (nucleoIdMap[aula.nucleoId] ?? '') : '',
      turmaId: aula.turmaId ? (turmaIdMap[aula.turmaId] ?? '') : '',
      professores: professoresRemapeados,
      alunos: alunosRemapeados,
      observacoes: aula.observacoes,
    };

    const { error } = await supabase.from('aulas').insert({
      data: aulaRemapeada.data,
      nucleo_id: aulaRemapeada.nucleoId || null,
      turma_id: aulaRemapeada.turmaId || null,
      professores: aulaRemapeada.professores,
      alunos: aulaRemapeada.alunos,
      observacoes: aulaRemapeada.observacoes,
    });
    if (!error) aulasCount++;
  }

  // ── Mensalidades (remapeando aluno_id e nucleo_id) ──
  let mensalidadesCount = 0;
  for (const m of backup.mensalidades ?? []) {
    const alunoId = alunoIdMap[m.alunoId];
    const nucleoId = nucleoIdMap[m.nucleoId];
    if (!alunoId || !nucleoId) continue; // referência quebrada no backup, ignora
    const { error } = await supabase.from('mensalidades').insert({
      aluno_id: alunoId, nucleo_id: nucleoId, ano: m.ano, mes: m.mes,
      valor: m.valor, pago: m.pago, data_pagamento: m.dataPagamento,
    });
    if (!error) mensalidadesCount++;
  }

  return {
    nucleos: Object.keys(nucleoIdMap).length,
    professores: Object.keys(professorIdMap).length,
    alunos: Object.keys(alunoIdMap).length,
    responsaveis: Object.keys(responsavelIdMap).length,
    aulas: aulasCount,
    mensalidades: mensalidadesCount,
    turmas: Object.keys(turmaIdMap).length,
  };
}

// Importa um backup (formato Backup — o mesmo dos arquivos .json exportados
// pelo app, e também o formato salvo no localStorage pela versão anterior)
// para o Supabase do usuário logado. Os ids antigos (gerados localmente,
// tipo "m4x2a1b") não são uuid, então tudo é reinserido com novo id e as
// referências (responsavelId, nucleoId, professorId, alunoId) são remapeadas.

import type { Backup, Aula, AulaProfessor, AulaAluno } from '../types/domain';
import { supabase } from './supabase';
import { nucleoToRow, professorToRow, responsavelToRow, alunoToRow } from './mappers';

export interface MigrationResult {
  nucleos: number;
  professores: number;
  alunos: number;
  responsaveis: number;
  aulas: number;
}

export async function importBackupToSupabase(backup: Partial<Backup>): Promise<MigrationResult> {
  const nucleoIdMap: Record<string, string> = {};
  const professorIdMap: Record<string, string> = {};
  const responsavelIdMap: Record<string, string> = {};
  const alunoIdMap: Record<string, string> = {};

  // ── Núcleos ──
  for (const n of backup.nucleos ?? []) {
    const { data, error } = await supabase.from('nucleos').insert(nucleoToRow(n)).select('id').single();
    if (!error && data) nucleoIdMap[n.id] = data.id;
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

  // ── Alunos (remapeando responsavel_id) ──
  for (const a of backup.alunos ?? []) {
    const row = alunoToRow(a);
    row.responsavel_id = a.responsavelId ? (responsavelIdMap[a.responsavelId] ?? null) : null;
    const { data, error } = await supabase.from('alunos').insert(row).select('id').single();
    if (!error && data) alunoIdMap[a.id] = data.id;
  }

  // ── Aulas (remapeando nucleo_id, professores[].professorId, alunos[].alunoId) ──
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
      professores: professoresRemapeados,
      alunos: alunosRemapeados,
      observacoes: aula.observacoes,
    };

    const { error } = await supabase.from('aulas').insert({
      data: aulaRemapeada.data,
      nucleo_id: aulaRemapeada.nucleoId || null,
      professores: aulaRemapeada.professores,
      alunos: aulaRemapeada.alunos,
      observacoes: aulaRemapeada.observacoes,
    });
    if (!error) aulasCount++;
  }

  return {
    nucleos: Object.keys(nucleoIdMap).length,
    professores: Object.keys(professorIdMap).length,
    alunos: Object.keys(alunoIdMap).length,
    responsaveis: Object.keys(responsavelIdMap).length,
    aulas: aulasCount,
  };
}

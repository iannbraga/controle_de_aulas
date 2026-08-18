import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Professor, Aluno, Nucleo, Responsavel, Turma } from '../types/domain';
import type { ProfessorRow, AlunoRow, NucleoRow, ResponsavelRow, TurmaRow } from '../types/db';
import { supabase } from '../lib/supabase';
import { nucleoFromRow, nucleoToRow, professorFromRow, professorToRow, responsavelFromRow, responsavelToRow, alunoFromRow, alunoToRow, turmaFromRow, turmaToRow } from '../lib/mappers';
import { readCache, writeCache, clearCache } from '../lib/cache';
import { nomeResponsavel } from '../lib/helpers';

const CACHE_KEY = 'xadrez-cache-catalog';

interface CatalogCache {
  professores: Professor[];
  alunos: Aluno[];
  nucleos: Nucleo[];
  responsaveis: Responsavel[];
  turmas: Turma[];
}

/**
 * Store dos cadastros: professores, alunos, núcleos e responsáveis.
 * Cada método de escrita fala direto com o Supabase (fonte da verdade) e
 * só depois atualiza o array reativo local, que é o que a UI usa.
 * Toda leitura passa por um cache local (ver lib/cache.ts): enquanto o
 * cache estiver dentro da validade configurada, o Supabase não é
 * consultado; toda escrita bem-sucedida atualiza o cache na hora.
 */
export const useCatalogStore = defineStore('catalog', () => {
  const professores = reactive<Professor[]>([]);
  const alunos = reactive<Aluno[]>([]);
  const nucleos = reactive<Nucleo[]>([]);
  const responsaveis = reactive<Responsavel[]>([]);
  const turmas = reactive<Turma[]>([]);
  const loading = ref(false);

  const professoresAtivos = computed(() => professores.filter(p => p.ativo));
  const alunosAtivos = computed(() => alunos.filter(a => a.ativo));
  const responsaveisAtivos = computed(() => responsaveis.filter(r => r.ativo));
  const nucleosAtivos = computed(() => nucleos.filter(n => n.ativo));
  const turmasAtivas = computed(() => turmas.filter(t => t.ativo));

  const getNucleoNome = (id: string | null | undefined) => nucleos.find(n => n.id === id)?.nome ?? '—';
  const getProfNome = (id: string | null | undefined) => professores.find(p => p.id === id)?.nome ?? '—';
  const getAlunoNome = (id: string | null | undefined) => alunos.find(a => a.id === id)?.nome ?? '—';
  const getRespNome = (id: string | null | undefined) => {
    const r = responsaveis.find(r => r.id === id);
    return r ? nomeResponsavel(r) : '—';
  };
  const getAlunosDoResponsavel = (respId: string) => alunos.filter(a => a.responsavelId === respId);
  const getAlunoResponsavel = (alunoId: string): string | null => {
    const al = alunos.find(a => a.id === alunoId);
    if (!al || !al.responsavelId) return null;
    return getRespNome(al.responsavelId);
  };
  const getTurmasDoNucleo = (nucleoId: string) => turmas.filter(t => t.nucleoId === nucleoId);
  const getAlunosDaTurma = (turmaId: string) => alunos.filter(a => a.turmaId === turmaId);

  function snapshotCache(): CatalogCache {
    return {
      professores: [...professores],
      alunos: [...alunos],
      nucleos: [...nucleos],
      responsaveis: [...responsaveis],
      turmas: [...turmas],
    };
  }
  function saveCache(): void { writeCache(CACHE_KEY, snapshotCache()); }
  function clearCatalogCache(): void { clearCache(CACHE_KEY); }

  async function fetchAll(cacheTtlMs = 0): Promise<void> {
    if (cacheTtlMs > 0) {
      const cached = readCache<CatalogCache>(CACHE_KEY, cacheTtlMs);
      if (cached) {
        professores.splice(0, professores.length, ...cached.professores);
        alunos.splice(0, alunos.length, ...cached.alunos);
        nucleos.splice(0, nucleos.length, ...cached.nucleos);
        responsaveis.splice(0, responsaveis.length, ...cached.responsaveis);
        turmas.splice(0, turmas.length, ...(cached.turmas ?? []));
        return;
      }
    }
    loading.value = true;
    const [profRes, alunoRes, nucleoRes, respRes, turmaRes] = await Promise.all([
      supabase.from('professores').select('*').order('nome'),
      supabase.from('alunos').select('*').order('nome'),
      supabase.from('nucleos').select('*').order('nome'),
      supabase.from('responsaveis').select('*').order('nome_pai'),
      supabase.from('turmas').select('*'),
    ]);
    if (!profRes.error) professores.splice(0, professores.length, ...(profRes.data as ProfessorRow[]).map(professorFromRow));
    if (!alunoRes.error) alunos.splice(0, alunos.length, ...(alunoRes.data as AlunoRow[]).map(alunoFromRow));
    if (!nucleoRes.error) nucleos.splice(0, nucleos.length, ...(nucleoRes.data as NucleoRow[]).map(nucleoFromRow));
    if (!respRes.error) responsaveis.splice(0, responsaveis.length, ...(respRes.data as ResponsavelRow[]).map(responsavelFromRow));
    if (!turmaRes.error) turmas.splice(0, turmas.length, ...(turmaRes.data as TurmaRow[]).map(turmaFromRow));
    loading.value = false;
    saveCache();
  }

  function limparEstadoLocal(): void {
    professores.splice(0);
    alunos.splice(0);
    nucleos.splice(0);
    responsaveis.splice(0);
    turmas.splice(0);
  }

  // ── Professor ──
  async function salvarProf(dados: Professor): Promise<void> {
    if (dados.id) {
      const { error } = await supabase.from('professores').update(professorToRow(dados)).eq('id', dados.id);
      if (error) throw error;
      const i = professores.findIndex(p => p.id === dados.id);
      if (i >= 0) Object.assign(professores[i], dados);
    } else {
      const { data, error } = await supabase.from('professores').insert(professorToRow(dados)).select().single();
      if (error) throw error;
      professores.push(professorFromRow(data as ProfessorRow));
    }
    saveCache();
  }
  async function delProf(id: string): Promise<void> {
    const { error } = await supabase.from('professores').delete().eq('id', id);
    if (error) throw error;
    professores.splice(professores.findIndex(p => p.id === id), 1);
    saveCache();
  }

  // ── Aluno ──
  async function salvarAluno(dados: Aluno): Promise<void> {
    if (dados.id) {
      const { error } = await supabase.from('alunos').update(alunoToRow(dados)).eq('id', dados.id);
      if (error) throw error;
      const i = alunos.findIndex(a => a.id === dados.id);
      if (i >= 0) Object.assign(alunos[i], dados);
    } else {
      const { data, error } = await supabase.from('alunos').insert(alunoToRow(dados)).select().single();
      if (error) throw error;
      alunos.push(alunoFromRow(data as AlunoRow));
    }
    saveCache();
  }
  async function delAluno(id: string): Promise<void> {
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    if (error) throw error;
    alunos.splice(alunos.findIndex(a => a.id === id), 1);
    saveCache();
  }

  // ── Núcleo ──
  async function salvarNucleo(dados: Nucleo): Promise<void> {
    if (dados.id) {
      const { error } = await supabase.from('nucleos').update(nucleoToRow(dados)).eq('id', dados.id);
      if (error) throw error;
      const i = nucleos.findIndex(n => n.id === dados.id);
      if (i >= 0) Object.assign(nucleos[i], dados);
    } else {
      const { data, error } = await supabase.from('nucleos').insert(nucleoToRow(dados)).select().single();
      if (error) throw error;
      nucleos.push(nucleoFromRow(data as NucleoRow));
    }
    saveCache();
  }
  async function delNucleo(id: string): Promise<void> {
    const { error } = await supabase.from('nucleos').delete().eq('id', id);
    if (error) throw error;
    nucleos.splice(nucleos.findIndex(n => n.id === id), 1);
    saveCache();
  }

  // ── Responsável ──
  async function salvarResp(dados: Responsavel): Promise<void> {
    if (dados.id) {
      const { error } = await supabase.from('responsaveis').update(responsavelToRow(dados)).eq('id', dados.id);
      if (error) throw error;
      const i = responsaveis.findIndex(r => r.id === dados.id);
      if (i >= 0) Object.assign(responsaveis[i], dados);
    } else {
      const { data, error } = await supabase.from('responsaveis').insert(responsavelToRow(dados)).select().single();
      if (error) throw error;
      responsaveis.push(responsavelFromRow(data as ResponsavelRow));
    }
    saveCache();
  }
  async function delResp(id: string): Promise<void> {
    // Remove vínculo dos alunos antes de excluir o responsável
    const vinculados = alunos.filter(a => a.responsavelId === id);
    for (const al of vinculados) {
      await supabase.from('alunos').update({ responsavel_id: null }).eq('id', al.id);
      al.responsavelId = '';
    }
    const { error } = await supabase.from('responsaveis').delete().eq('id', id);
    if (error) throw error;
    responsaveis.splice(responsaveis.findIndex(r => r.id === id), 1);
    saveCache();
  }

  // Desativa o responsável e, junto, todos os alunos vinculados a ele que
  // ainda estejam ativos (usado quando o usuário confirma a desativação em
  // cascata na tela de Responsáveis; reativar continua sendo feito um a um).
  async function desativarRespComAlunos(id: string): Promise<void> {
    const resp = responsaveis.find(r => r.id === id);
    if (resp && resp.ativo) await salvarResp({ ...resp, ativo: false });
    const vinculados = alunos.filter(a => a.responsavelId === id && a.ativo);
    for (const al of vinculados) await salvarAluno({ ...al, ativo: false });
  }

  // ── Turma ──
  async function salvarTurma(dados: Turma): Promise<void> {
    if (dados.id) {
      const { error } = await supabase.from('turmas').update(turmaToRow(dados)).eq('id', dados.id);
      if (error) throw error;
      const i = turmas.findIndex(t => t.id === dados.id);
      if (i >= 0) Object.assign(turmas[i], dados);
    } else {
      const { data, error } = await supabase.from('turmas').insert(turmaToRow(dados)).select().single();
      if (error) throw error;
      turmas.push(turmaFromRow(data as TurmaRow));
    }
    saveCache();
  }
  async function delTurma(id: string): Promise<void> {
    // Desvincula os alunos matriculados nesta turma antes de excluir
    const vinculados = alunos.filter(a => a.turmaId === id);
    for (const al of vinculados) {
      await supabase.from('alunos').update({ turma_id: null }).eq('id', al.id);
      al.turmaId = '';
    }
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (error) throw error;
    turmas.splice(turmas.findIndex(t => t.id === id), 1);
    saveCache();
  }

  async function limparTudo(): Promise<void> {
    await Promise.all([
      supabase.from('professores').delete().not('id', 'is', null),
      supabase.from('alunos').delete().not('id', 'is', null),
      supabase.from('nucleos').delete().not('id', 'is', null),
      supabase.from('responsaveis').delete().not('id', 'is', null),
      supabase.from('turmas').delete().not('id', 'is', null),
    ]);
    limparEstadoLocal();
    saveCache();
  }

  return {
    professores, alunos, nucleos, responsaveis, turmas, loading,
    professoresAtivos, alunosAtivos, responsaveisAtivos, nucleosAtivos, turmasAtivas,
    getNucleoNome, getProfNome, getAlunoNome, getRespNome,
    getAlunosDoResponsavel, getAlunoResponsavel, getTurmasDoNucleo, getAlunosDaTurma,
    fetchAll, limparEstadoLocal, clearCatalogCache,
    salvarProf, delProf,
    salvarAluno, delAluno,
    salvarNucleo, delNucleo,
    salvarResp, delResp, desativarRespComAlunos,
    salvarTurma, delTurma,
    limparTudo,
  };
});

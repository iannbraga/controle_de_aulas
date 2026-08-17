import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { Professor, Aluno, Nucleo, Responsavel } from '../types/domain';
import { genId } from '../lib/helpers';
import { loadData } from '../lib/persistence';

const saved = loadData();

/**
 * Store dos cadastros: professores, alunos, núcleos e responsáveis.
 * Mantido em um único store (em vez de 4) porque as ações de CRUD são
 * pequenas e os dados são fortemente relacionados entre si (aluno →
 * responsável, aula → professor/núcleo).
 */
export const useCatalogStore = defineStore('catalog', () => {
  const professores = reactive<Professor[]>(saved.professores ?? []);
  const alunos = reactive<Aluno[]>(saved.alunos ?? []);
  const nucleos = reactive<Nucleo[]>(saved.nucleos ?? []);
  const responsaveis = reactive<Responsavel[]>(saved.responsaveis ?? []);

  const professoresAtivos = computed(() => professores.filter(p => p.ativo));
  const alunosAtivos = computed(() => alunos.filter(a => a.ativo));
  const responsaveisAtivos = computed(() => responsaveis.filter(r => r.ativo));

  const getNucleoNome = (id: string | null | undefined) => nucleos.find(n => n.id === id)?.nome ?? '—';
  const getProfNome = (id: string | null | undefined) => professores.find(p => p.id === id)?.nome ?? '—';
  const getAlunoNome = (id: string | null | undefined) => alunos.find(a => a.id === id)?.nome ?? '—';
  const getRespNome = (id: string | null | undefined) => responsaveis.find(r => r.id === id)?.nome ?? '—';
  const getAlunosDoResponsavel = (respId: string) => alunos.filter(a => a.responsavelId === respId);
  const getAlunoResponsavel = (alunoId: string): string | null => {
    const al = alunos.find(a => a.id === alunoId);
    if (!al || !al.responsavelId) return null;
    return getRespNome(al.responsavelId);
  };

  // ── Professor ──
  function salvarProf(dados: Professor): void {
    if (dados.id) {
      const i = professores.findIndex(p => p.id === dados.id);
      if (i >= 0) Object.assign(professores[i], dados);
    } else {
      professores.push({ ...dados, id: genId() });
    }
  }
  function delProf(id: string): void {
    professores.splice(professores.findIndex(p => p.id === id), 1);
  }

  // ── Aluno ──
  function salvarAluno(dados: Aluno): void {
    if (dados.id) {
      const i = alunos.findIndex(a => a.id === dados.id);
      if (i >= 0) Object.assign(alunos[i], dados);
    } else {
      alunos.push({ ...dados, id: genId() });
    }
  }
  function delAluno(id: string): void {
    alunos.splice(alunos.findIndex(a => a.id === id), 1);
  }

  // ── Núcleo ──
  function salvarNucleo(dados: Nucleo): void {
    if (dados.id) {
      const i = nucleos.findIndex(n => n.id === dados.id);
      if (i >= 0) Object.assign(nucleos[i], dados);
    } else {
      nucleos.push({ ...dados, id: genId() });
    }
  }
  function delNucleo(id: string): void {
    nucleos.splice(nucleos.findIndex(n => n.id === id), 1);
  }

  // ── Responsável ──
  function salvarResp(dados: Responsavel): void {
    if (dados.id) {
      const i = responsaveis.findIndex(r => r.id === dados.id);
      if (i >= 0) Object.assign(responsaveis[i], dados);
    } else {
      responsaveis.push({ ...dados, id: genId() });
    }
  }
  function delResp(id: string): void {
    // Remove vínculo dos alunos antes de excluir o responsável
    alunos.forEach(a => { if (a.responsavelId === id) a.responsavelId = ''; });
    responsaveis.splice(responsaveis.findIndex(r => r.id === id), 1);
  }

  function limparTudo(): void {
    professores.splice(0);
    alunos.splice(0);
    nucleos.splice(0);
    responsaveis.splice(0);
  }

  function importar(dados: { professores: Professor[]; alunos: Aluno[]; nucleos: Nucleo[]; responsaveis?: Responsavel[] }): void {
    professores.splice(0, professores.length, ...dados.professores);
    alunos.splice(0, alunos.length, ...dados.alunos);
    nucleos.splice(0, nucleos.length, ...dados.nucleos);
    responsaveis.splice(0, responsaveis.length, ...(dados.responsaveis || []));
  }

  return {
    professores, alunos, nucleos, responsaveis,
    professoresAtivos, alunosAtivos, responsaveisAtivos,
    getNucleoNome, getProfNome, getAlunoNome, getRespNome,
    getAlunosDoResponsavel, getAlunoResponsavel,
    salvarProf, delProf,
    salvarAluno, delAluno,
    salvarNucleo, delNucleo,
    salvarResp, delResp,
    limparTudo, importar,
  };
});

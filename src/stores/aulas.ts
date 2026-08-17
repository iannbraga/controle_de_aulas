import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Aula, AulaProfessor, PendenciaAluno } from '../types/domain';
import { genId, calcTotal, mesEncerrado } from '../lib/helpers';
import { loadData } from '../lib/persistence';
import { useCatalogStore } from './catalog';

const saved = loadData();

const blankAula = (): Aula => ({
  id: '',
  data: new Date().toISOString().slice(0, 10),
  nucleoId: '',
  professores: [],
  alunos: [],
  observacoes: '',
});

export const useAulasStore = defineStore('aulas', () => {
  const aulas = reactive<Aula[]>(saved.aulas ?? []);
  const form = reactive<Aula>(blankAula());
  const profDetalheAberto = reactive<Record<string, boolean>>({});
  const chavePix = ref('xadrez.cesamar@gmail.com');
  const aulaFinanceiro = ref<Aula | null>(null);

  function openFinanceiro(aula: Aula): void {
    aulaFinanceiro.value = aula;
  }

  const aulasSorted = computed(() => [...aulas].sort((a, b) => b.data.localeCompare(a.data)));

  // ── Formulário / CRUD ──
  function openNovaAula(): void {
    Object.assign(form, blankAula(), { id: '' });
    form.professores = [];
    form.alunos = [];
  }

  function editarAula(aula: Aula): void {
    const clone: Aula = JSON.parse(JSON.stringify(aula));
    const catalog = useCatalogStore();
    const idsJaExistem = new Set(clone.alunos.map(a => a.alunoId));
    for (const al of catalog.alunos.filter(a => a.ativo)) {
      if (!idsJaExistem.has(al.id)) clone.alunos.push({ alunoId: al.id, valorPago: al.valorPadrao, presente: false, pago: true });
    }
    Object.assign(form, clone);
  }

  function aulaHasProf(profId: string): boolean {
    return form.professores.some(p => p.professorId === profId);
  }
  function toggleProfAula(profId: string, peso: number): void {
    const idx = form.professores.findIndex(p => p.professorId === profId);
    if (idx >= 0) form.professores.splice(idx, 1);
    else form.professores.push({ professorId: profId, pesoAplicado: peso } as AulaProfessor);
  }
  function aulaAlunoPresente(alunoId: string): boolean {
    return form.alunos.find(a => a.alunoId === alunoId)?.presente ?? false;
  }
  function getAlunoValor(alunoId: string): number | '' {
    return form.alunos.find(a => a.alunoId === alunoId)?.valorPago ?? '';
  }
  function getAlunoPago(alunoId: string): boolean {
    const al = form.alunos.find(a => a.alunoId === alunoId);
    return al ? al.pago !== false : true;
  }
  function setAlunoPago(alunoId: string, pago: boolean): void {
    const idx = form.alunos.findIndex(a => a.alunoId === alunoId);
    if (idx >= 0) form.alunos[idx].pago = pago;
  }
  function toggleAlunoAula(alunoId: string, valorPadrao: number, checked: boolean): void {
    const idx = form.alunos.findIndex(a => a.alunoId === alunoId);
    if (idx >= 0) form.alunos[idx].presente = checked;
    else form.alunos.push({ alunoId, valorPago: valorPadrao, presente: checked, pago: true });
  }
  function setAlunoValor(alunoId: string, val: string): void {
    const idx = form.alunos.findIndex(a => a.alunoId === alunoId);
    if (idx >= 0) form.alunos[idx].valorPago = parseFloat(val) || 0;
  }
  function calcTotalForm(): number {
    return form.alunos.filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);
  }

  function salvarAula(): { ok: boolean; msg?: string } {
    if (!form.data) return { ok: false, msg: 'Informe a data da aula.' };
    if (!form.nucleoId) return { ok: false, msg: 'Selecione o núcleo.' };
    if (form.id) {
      const i = aulas.findIndex(a => a.id === form.id);
      if (i >= 0) Object.assign(aulas[i], JSON.parse(JSON.stringify(form)));
    } else {
      aulas.push(JSON.parse(JSON.stringify({ ...form, id: genId() })));
    }
    return { ok: true };
  }
  function delAula(id: string): void {
    aulas.splice(aulas.findIndex(a => a.id === id), 1);
  }

  function toggleProfDetalhe(profId: string): void {
    profDetalheAberto[profId] = !profDetalheAberto[profId];
  }

  // ── Pendências ──
  function buildPendenciasMap(pagas: boolean): PendenciaAluno[] {
    const catalog = useCatalogStore();
    const map: Record<string, PendenciaAluno> = {};
    for (const aula of aulas) {
      if (!mesEncerrado(aula.data)) continue; // mês ainda não encerrado: não é pendência
      for (const aa of aula.alunos) {
        if (aa.presente && aa.pago === pagas) {
          if (!map[aa.alunoId]) {
            const alunoObj = catalog.alunos.find(a => a.id === aa.alunoId);
            const respObj = alunoObj?.responsavelId ? catalog.responsaveis.find(r => r.id === alunoObj.responsavelId) : null;
            map[aa.alunoId] = {
              alunoId: aa.alunoId,
              nome: catalog.getAlunoNome(aa.alunoId),
              responsavel: respObj ? respObj.nome : null,
              responsavelTel: respObj ? respObj.telefone : null,
              aulas: [],
              total: 0,
            };
          }
          map[aa.alunoId].aulas.push({ aulaId: aula.id, data: aula.data, nucleoId: aula.nucleoId, valor: aa.valorPago || 0 });
          map[aa.alunoId].total += aa.valorPago || 0;
        }
      }
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }

  const todasPendencias = computed(() => buildPendenciasMap(false));
  const todasPendenciasPagas = computed(() => buildPendenciasMap(true));
  const totalPendenciasGeral = computed(() => todasPendencias.value.length);
  const totalPendenciasGeralValor = computed(() => todasPendencias.value.reduce((s, p) => s + p.total, 0));

  function aulaTempendencia(aula: Aula): boolean {
    return aula.alunos.some(aa => aa.presente && !aa.pago);
  }
  function contarPendenciasAula(aula: Aula): number {
    return aula.alunos.filter(aa => aa.presente && !aa.pago).length;
  }
  function getPendenciasAluno(alunoId: string) {
    return todasPendencias.value.find(p => p.alunoId === alunoId)?.aulas ?? [];
  }
  function marcarPago(aulaId: string, alunoId: string): boolean {
    const aula = aulas.find(a => a.id === aulaId);
    if (!aula) return false;
    const aa = aula.alunos.find(a => a.alunoId === alunoId);
    if (aa) { aa.pago = true; return true; }
    return false;
  }
  function marcarTodosPagos(pa: PendenciaAluno): void {
    for (const item of pa.aulas) marcarPago(item.aulaId, pa.alunoId);
  }

  // ── Import/Export ──
  function exportSnapshot(): Aula[] {
    return [...aulas];
  }
  function importar(dados: Aula[]): void {
    aulas.splice(0, aulas.length, ...dados);
  }
  function limparTudo(): void {
    aulas.splice(0);
  }

  return {
    aulas, form, profDetalheAberto, chavePix, aulasSorted, aulaFinanceiro, openFinanceiro,
    openNovaAula, editarAula, salvarAula, delAula,
    aulaHasProf, toggleProfAula, aulaAlunoPresente, getAlunoValor, getAlunoPago, setAlunoPago,
    toggleAlunoAula, setAlunoValor, calcTotalForm, toggleProfDetalhe,
    todasPendencias, todasPendenciasPagas, totalPendenciasGeral, totalPendenciasGeralValor,
    aulaTempendencia, contarPendenciasAula, getPendenciasAluno, marcarPago, marcarTodosPagos,
    exportSnapshot, importar, limparTudo,
  };
});

export { calcTotal };

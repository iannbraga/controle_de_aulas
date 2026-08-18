import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Aula, AulaProfessor, PendenciaAluno } from '../types/domain';
import type { AulaRow } from '../types/db';
import { mesEncerrado, calcTotal, calcPesoTotal, aulaInMonth, nomeResponsavel, telefoneResponsavel } from '../lib/helpers';
import { supabase } from '../lib/supabase';
import { aulaFromRow, aulaToRow } from '../lib/mappers';
import { readCache, writeCache, clearCache } from '../lib/cache';
import { useCatalogStore } from './catalog';
import { useMensalidadesStore } from './mensalidades';

const CACHE_KEY = 'xadrez-cache-aulas';

const blankAula = (): Aula => ({
  id: '',
  data: new Date().toISOString().slice(0, 10),
  nucleoId: '',
  turmaId: '',
  professores: [],
  alunos: [],
  observacoes: '',
});

export const useAulasStore = defineStore('aulas', () => {
  const aulas = reactive<Aula[]>([]);
  const form = reactive<Aula>(blankAula());
  const profDetalheAberto = reactive<Record<string, boolean>>({});
  const chavePix = ref('xadrez.cesamar@gmail.com');
  const aulaFinanceiro = ref<Aula | null>(null);
  const loading = ref(false);

  function openFinanceiro(aula: Aula): void {
    aulaFinanceiro.value = aula;
  }

  const aulasSorted = computed(() => [...aulas].sort((a, b) => b.data.localeCompare(a.data)));

  function saveCache(): void { writeCache(CACHE_KEY, [...aulas]); }
  function clearAulasCache(): void { clearCache(CACHE_KEY); }

  async function fetchAll(cacheTtlMs = 0): Promise<void> {
    if (cacheTtlMs > 0) {
      const cached = readCache<Aula[]>(CACHE_KEY, cacheTtlMs);
      if (cached) {
        aulas.splice(0, aulas.length, ...cached);
        return;
      }
    }
    loading.value = true;
    const { data, error } = await supabase.from('aulas').select('*').order('data', { ascending: false });
    if (!error && data) aulas.splice(0, aulas.length, ...(data as AulaRow[]).map(aulaFromRow));
    loading.value = false;
    saveCache();
  }

  function limparEstadoLocal(): void {
    aulas.splice(0);
  }

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
      if (!idsJaExistem.has(al.id)) clone.alunos.push({ alunoId: al.id, valorPago: al.valorPadrao, presente: false, pago: false });
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
    return al ? al.pago === true : false;
  }
  function setAlunoPago(alunoId: string, pago: boolean): void {
    const idx = form.alunos.findIndex(a => a.alunoId === alunoId);
    if (idx >= 0) form.alunos[idx].pago = pago;
  }
  function toggleAlunoAula(alunoId: string, valorPadrao: number, checked: boolean): void {
    const idx = form.alunos.findIndex(a => a.alunoId === alunoId);
    if (idx >= 0) {
      form.alunos[idx].presente = checked;
      // Ao marcar presença de um aluno que já tinha um registro (ex: reaberto na edição),
      // o pagamento não fica assumido — o usuário precisa confirmar explicitamente.
      if (checked) form.alunos[idx].pago = false;
    }
    else form.alunos.push({ alunoId, valorPago: valorPadrao, presente: checked, pago: false });
  }
  function setAlunoValor(alunoId: string, val: string): void {
    const idx = form.alunos.findIndex(a => a.alunoId === alunoId);
    if (idx >= 0) form.alunos[idx].valorPago = parseFloat(val) || 0;
  }
  function calcTotalForm(): number {
    return form.alunos.filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);
  }

  async function salvarAula(): Promise<{ ok: boolean; msg?: string }> {
    if (!form.data) return { ok: false, msg: 'Informe a data da aula.' };
    if (!form.nucleoId) return { ok: false, msg: 'Selecione o núcleo.' };
    const payload = aulaToRow(JSON.parse(JSON.stringify(form)));
    if (form.id) {
      const { error } = await supabase.from('aulas').update(payload).eq('id', form.id);
      if (error) return { ok: false, msg: 'Erro ao salvar: ' + error.message };
      const i = aulas.findIndex(a => a.id === form.id);
      if (i >= 0) Object.assign(aulas[i], JSON.parse(JSON.stringify(form)));
    } else {
      const { data, error } = await supabase.from('aulas').insert(payload).select().single();
      if (error) return { ok: false, msg: 'Erro ao salvar: ' + error.message };
      aulas.push(aulaFromRow(data as AulaRow));
    }
    saveCache();
    return { ok: true };
  }
  async function delAula(id: string): Promise<void> {
    const { error } = await supabase.from('aulas').delete().eq('id', id);
    if (error) throw error;
    aulas.splice(aulas.findIndex(a => a.id === id), 1);
    saveCache();
  }

  function toggleProfDetalhe(profId: string): void {
    profDetalheAberto[profId] = !profDetalheAberto[profId];
  }

  // ── Cálculo financeiro (considera forma de cobrança do núcleo) ──
  // Núcleos 'porAula': soma o valorPago dos alunos presentes na própria aula
  // (modelo original). Núcleos 'mensalidade': a "receita" da aula é o total
  // de mensalidades do mês naquele núcleo, dividido igualmente pelo número
  // de aulas do mês — pago adiantado, não depende de presença.
  function valorAula(aula: Aula): number {
    const catalog = useCatalogStore();
    const nucleo = catalog.nucleos.find(n => n.id === aula.nucleoId);
    if (nucleo?.formaCobranca === 'mensalidade') {
      const mensalidadesStore = useMensalidadesStore();
      const [y, m] = aula.data.split('-').map(Number);
      const ano = y, mes = m - 1;
      const totalMes = mensalidadesStore.totalDoMes(aula.nucleoId, ano, mes);
      const numAulasMes = aulas.filter(a => a.nucleoId === aula.nucleoId && aulaInMonth(a, ano, mes)).length;
      return numAulasMes > 0 ? totalMes / numAulasMes : 0;
    }
    return calcTotal(aula);
  }
  function valorPorPesoAula(aula: Aula): number {
    const pt = calcPesoTotal(aula);
    return pt > 0 ? valorAula(aula) / pt : 0;
  }
  function nucleoEhMensalidade(nucleoId: string): boolean {
    const catalog = useCatalogStore();
    return catalog.nucleos.find(n => n.id === nucleoId)?.formaCobranca === 'mensalidade';
  }

  // ── Pendências (só se aplica a núcleos com cobrança por aula — núcleos de
  // mensalidade têm sua própria pendência, ver stores/mensalidades.ts) ──
  function buildPendenciasMap(pagas: boolean): PendenciaAluno[] {
    const catalog = useCatalogStore();
    const map: Record<string, PendenciaAluno> = {};
    for (const aula of aulas) {
      if (!mesEncerrado(aula.data)) continue; // mês ainda não encerrado: não é pendência
      if (nucleoEhMensalidade(aula.nucleoId)) continue; // cobrado via mensalidade, não por aula
      for (const aa of aula.alunos) {
        if (aa.presente && aa.pago === pagas) {
          if (!map[aa.alunoId]) {
            const alunoObj = catalog.alunos.find(a => a.id === aa.alunoId);
            const respObj = alunoObj?.responsavelId ? catalog.responsaveis.find(r => r.id === alunoObj.responsavelId) : null;
            map[aa.alunoId] = {
              alunoId: aa.alunoId,
              nome: catalog.getAlunoNome(aa.alunoId),
              responsavel: respObj ? nomeResponsavel(respObj) : null,
              responsavelTel: respObj ? telefoneResponsavel(respObj) : null,
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
    if (nucleoEhMensalidade(aula.nucleoId)) return false;
    return aula.alunos.some(aa => aa.presente && !aa.pago);
  }
  function contarPendenciasAula(aula: Aula): number {
    if (nucleoEhMensalidade(aula.nucleoId)) return 0;
    return aula.alunos.filter(aa => aa.presente && !aa.pago).length;
  }
  function getPendenciasAluno(alunoId: string) {
    return todasPendencias.value.find(p => p.alunoId === alunoId)?.aulas ?? [];
  }
  async function marcarPago(aulaId: string, alunoId: string): Promise<boolean> {
    const aula = aulas.find(a => a.id === aulaId);
    if (!aula) return false;
    const aa = aula.alunos.find(a => a.alunoId === alunoId);
    if (!aa) return false;
    aa.pago = true;
    const { error } = await supabase.from('aulas').update(aulaToRow(JSON.parse(JSON.stringify(aula)))).eq('id', aulaId);
    if (error) { aa.pago = false; return false; }
    saveCache();
    return true;
  }
  async function marcarTodosPagos(pa: PendenciaAluno): Promise<void> {
    for (const item of pa.aulas) await marcarPago(item.aulaId, pa.alunoId);
  }

  function exportSnapshot(): Aula[] {
    return [...aulas];
  }

  async function limparTudo(): Promise<void> {
    const { error } = await supabase.from('aulas').delete().not('id', 'is', null);
    if (error) throw error;
    aulas.splice(0);
    saveCache();
  }

  return {
    aulas, form, profDetalheAberto, chavePix, aulasSorted, aulaFinanceiro, openFinanceiro, loading,
    fetchAll, limparEstadoLocal, clearAulasCache,
    openNovaAula, editarAula, salvarAula, delAula,
    aulaHasProf, toggleProfAula, aulaAlunoPresente, getAlunoValor, getAlunoPago, setAlunoPago,
    toggleAlunoAula, setAlunoValor, calcTotalForm, toggleProfDetalhe,
    valorAula, valorPorPesoAula, nucleoEhMensalidade,
    todasPendencias, todasPendenciasPagas, totalPendenciasGeral, totalPendenciasGeralValor,
    aulaTempendencia, contarPendenciasAula, getPendenciasAluno, marcarPago, marcarTodosPagos,
    exportSnapshot, limparTudo,
  };
});

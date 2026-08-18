import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Mensalidade } from '../types/domain';
import type { MensalidadeRow } from '../types/db';
import { supabase } from '../lib/supabase';
import { mensalidadeFromRow } from '../lib/mappers';
import { readCache, writeCache, clearCache } from '../lib/cache';
import { useCatalogStore } from './catalog';

const CACHE_KEY = 'xadrez-cache-mensalidades';

/**
 * Store da cobrança por mensalidade (núcleos com formaCobranca ===
 * 'mensalidade', ex: Maple Bear). Cada linha representa a cobrança de UM
 * aluno matriculado num núcleo, num mês específico — gerada adiantada
 * (antes das aulas acontecerem) e independente de presença.
 */
export const useMensalidadesStore = defineStore('mensalidades', () => {
  const mensalidades = reactive<Mensalidade[]>([]);
  const loading = ref(false);

  function saveCache(): void { writeCache(CACHE_KEY, [...mensalidades]); }
  function clearMensalidadesCache(): void { clearCache(CACHE_KEY); }

  async function fetchAll(cacheTtlMs = 0): Promise<void> {
    if (cacheTtlMs > 0) {
      const cached = readCache<Mensalidade[]>(CACHE_KEY, cacheTtlMs);
      if (cached) {
        mensalidades.splice(0, mensalidades.length, ...cached);
        return;
      }
    }
    loading.value = true;
    const { data, error } = await supabase.from('mensalidades').select('*');
    if (!error && data) mensalidades.splice(0, mensalidades.length, ...(data as MensalidadeRow[]).map(mensalidadeFromRow));
    loading.value = false;
    saveCache();
  }

  function limparEstadoLocal(): void {
    mensalidades.splice(0);
  }

  function getDoMes(nucleoId: string, ano: number, mes: number): Mensalidade[] {
    return mensalidades.filter(m => m.nucleoId === nucleoId && m.ano === ano && m.mes === mes);
  }
  function totalDoMes(nucleoId: string, ano: number, mes: number): number {
    return getDoMes(nucleoId, ano, mes).reduce((s, m) => s + (m.valor || 0), 0);
  }

  /**
   * Garante que todo aluno ativo matriculado no núcleo tenha uma cobrança de
   * mensalidade gerada para o mês informado (cria só o que estiver faltando —
   * chamado sempre que a tela de Mensalidades é aberta/navegada).
   */
  async function garantirMes(nucleoId: string, ano: number, mes: number): Promise<void> {
    const catalog = useCatalogStore();
    const alunosDoNucleo = catalog.alunos.filter(a => a.ativo && a.nucleoId === nucleoId);
    const existentes = new Set(getDoMes(nucleoId, ano, mes).map(m => m.alunoId));
    const faltantes = alunosDoNucleo.filter(a => !existentes.has(a.id));
    if (faltantes.length === 0) return;

    const payload = faltantes.map(a => ({
      aluno_id: a.id, nucleo_id: nucleoId, ano, mes, valor: a.valorMensalidade || 0, pago: false,
    }));
    const { data, error } = await supabase.from('mensalidades').upsert(payload, { onConflict: 'aluno_id,nucleo_id,ano,mes', ignoreDuplicates: true }).select();
    if (!error && data) {
      for (const row of data as MensalidadeRow[]) {
        if (!mensalidades.some(m => m.id === row.id)) mensalidades.push(mensalidadeFromRow(row));
      }
      saveCache();
    }
  }

  async function marcarPago(id: string, pago: boolean): Promise<boolean> {
    const m = mensalidades.find(x => x.id === id);
    if (!m) return false;
    const prev = { pago: m.pago, dataPagamento: m.dataPagamento };
    m.pago = pago;
    m.dataPagamento = pago ? new Date().toISOString().slice(0, 10) : null;
    const { error } = await supabase.from('mensalidades').update({ pago: m.pago, data_pagamento: m.dataPagamento }).eq('id', id);
    if (error) { Object.assign(m, prev); return false; }
    saveCache();
    return true;
  }

  async function salvarValor(id: string, valor: number): Promise<boolean> {
    const m = mensalidades.find(x => x.id === id);
    if (!m) return false;
    const prev = m.valor;
    m.valor = valor;
    const { error } = await supabase.from('mensalidades').update({ valor }).eq('id', id);
    if (error) { m.valor = prev; return false; }
    saveCache();
    return true;
  }

  async function limparTudo(): Promise<void> {
    const { error } = await supabase.from('mensalidades').delete().not('id', 'is', null);
    if (error) throw error;
    mensalidades.splice(0);
    saveCache();
  }

  return {
    mensalidades, loading,
    fetchAll, limparEstadoLocal, clearMensalidadesCache,
    getDoMes, totalDoMes, garantirMes, marcarPago, salvarValor, limparTudo,
  };
});

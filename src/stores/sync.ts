import { ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '../lib/supabase';
import { loadData } from '../lib/persistence';
import { importBackupToSupabase } from '../lib/migration';
import { useCatalogStore } from './catalog';
import { useAulasStore } from './aulas';
import { useMensalidadesStore } from './mensalidades';
import { useSettingsStore } from './settings';

const LOCAL_MIGRATION_FLAG = 'xadrez-migrado-supabase';

/**
 * Orquestra o carregamento de dados depois do login: verifica se o usuário
 * já tem alguma coisa no Supabase; se não tiver E existirem dados antigos
 * no localStorage deste navegador, migra automaticamente antes de carregar
 * os stores.
 */
export const useSyncStore = defineStore('sync', () => {
  const status = ref<'idle' | 'checking' | 'migrating' | 'loading' | 'ready' | 'error'>('idle');
  const errorMsg = ref<string | null>(null);
  const migrationSummary = ref<string | null>(null);

  async function usuarioTemDadosNoSupabase(): Promise<boolean> {
    const { count, error } = await supabase.from('nucleos').select('id', { count: 'exact', head: true });
    if (error) return false;
    if ((count ?? 0) > 0) return true;
    const checks = await Promise.all([
      supabase.from('professores').select('id', { count: 'exact', head: true }),
      supabase.from('alunos').select('id', { count: 'exact', head: true }),
      supabase.from('aulas').select('id', { count: 'exact', head: true }),
    ]);
    return checks.some(r => (r.count ?? 0) > 0);
  }

  async function bootstrap(): Promise<void> {
    status.value = 'checking';
    errorMsg.value = null;
    try {
      const catalog = useCatalogStore();
      const aulasStore = useAulasStore();
      const mensalidadesStore = useMensalidadesStore();
      let acabouDeMigrar = false;

      const jaMigrado = localStorage.getItem(LOCAL_MIGRATION_FLAG) === '1';
      if (!jaMigrado && !(await usuarioTemDadosNoSupabase())) {
        const local = loadData();
        const temDadosLocais = !!(local.professores?.length || local.alunos?.length || local.nucleos?.length || local.aulas?.length);
        if (temDadosLocais) {
          status.value = 'migrating';
          const resumo = await importBackupToSupabase(local);
          migrationSummary.value = `Migrado: ${resumo.aulas} aulas, ${resumo.professores} professores, ${resumo.alunos} alunos, ${resumo.nucleos} núcleos, ${resumo.responsaveis} responsáveis.`;
          acabouDeMigrar = true;
          // Dados acabaram de ser escritos direto no Supabase — descarta
          // qualquer cache antigo (de antes da migração) pra não reaparecer.
          catalog.clearCatalogCache();
          aulasStore.clearAulasCache();
          mensalidadesStore.clearMensalidadesCache();
        }
        localStorage.setItem(LOCAL_MIGRATION_FLAG, '1');
      }

      status.value = 'loading';
      const settings = useSettingsStore();
      if (!settings.loaded) await settings.fetch();
      const cacheTtlMs = acabouDeMigrar ? 0 : settings.cacheTtlMinutos * 60_000;
      await catalog.fetchAll(cacheTtlMs);
      await aulasStore.fetchAll(cacheTtlMs);
      await mensalidadesStore.fetchAll(cacheTtlMs);
      status.value = 'ready';
    } catch (e: any) {
      status.value = 'error';
      errorMsg.value = e?.message ?? 'Erro ao carregar dados do Supabase.';
    }
  }

  function reset(): void {
    status.value = 'idle';
    errorMsg.value = null;
    migrationSummary.value = null;
    const catalog = useCatalogStore();
    const aulasStore = useAulasStore();
    const mensalidadesStore = useMensalidadesStore();
    catalog.limparEstadoLocal();
    aulasStore.limparEstadoLocal();
    mensalidadesStore.limparEstadoLocal();
    catalog.clearCatalogCache();
    aulasStore.clearAulasCache();
    mensalidadesStore.clearMensalidadesCache();
  }

  return { status, errorMsg, migrationSummary, bootstrap, reset };
});

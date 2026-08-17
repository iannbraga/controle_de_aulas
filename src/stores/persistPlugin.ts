import type { PiniaPluginContext } from 'pinia';
import { persistData } from '../lib/persistence';

/**
 * Plugin Pinia que persiste os dados dos stores 'catalog' e 'aulas' no
 * localStorage a cada mutação, no mesmo formato/chave (`xadrez-v2`) usado
 * pela versão anterior do app — garante que backups/dados existentes dos
 * usuários continuem funcionando após a migração para Vite.
 */
export function persistencePlugin({ store, pinia }: PiniaPluginContext): void {
  if (store.$id !== 'catalog' && store.$id !== 'aulas') return;

  const persist = () => {
    const catalog = pinia.state.value.catalog as any;
    const aulas = pinia.state.value.aulas as any;
    if (!catalog || !aulas) return;
    persistData({
      professores: catalog.professores ?? [],
      alunos: catalog.alunos ?? [],
      nucleos: catalog.nucleos ?? [],
      responsaveis: catalog.responsaveis ?? [],
      aulas: aulas.aulas ?? [],
    });
  };

  store.$subscribe(persist, { detached: true, deep: true });
}

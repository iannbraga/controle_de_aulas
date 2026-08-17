import { ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '../lib/supabase';
import type { AppSettingsRow } from '../types/db';

/**
 * Configurações globais do app (hoje só uma: permitir criação de conta).
 * A linha é lida SEM precisar estar logado — a tela de Login usa isso pra
 * decidir se mostra "Criar conta" — e só pode ser alterada por quem já
 * está autenticado (ver policies em supabase/schema.sql).
 */
export const useSettingsStore = defineStore('settings', () => {
  const permitirCadastro = ref(true);
  const cacheTtlMinutos = ref(30);
  const loaded = ref(false);
  const saving = ref(false);

  async function fetch(): Promise<void> {
    const { data, error } = await supabase.from('app_settings').select('*').eq('id', true).maybeSingle();
    if (!error && data) {
      const row = data as AppSettingsRow;
      permitirCadastro.value = row.permitir_cadastro;
      cacheTtlMinutos.value = row.cache_ttl_minutos;
    }
    loaded.value = true;
  }

  async function setPermitirCadastro(valor: boolean): Promise<boolean> {
    const anterior = permitirCadastro.value;
    permitirCadastro.value = valor; // otimista
    saving.value = true;
    const { error } = await supabase.from('app_settings').update({ permitir_cadastro: valor }).eq('id', true);
    saving.value = false;
    if (error) { permitirCadastro.value = anterior; return false; }
    return true;
  }

  async function setCacheTtlMinutos(valor: number): Promise<boolean> {
    const anterior = cacheTtlMinutos.value;
    cacheTtlMinutos.value = valor; // otimista
    saving.value = true;
    const { error } = await supabase.from('app_settings').update({ cache_ttl_minutos: valor }).eq('id', true);
    saving.value = false;
    if (error) { cacheTtlMinutos.value = anterior; return false; }
    return true;
  }

  return { permitirCadastro, cacheTtlMinutos, loaded, saving, fetch, setPermitirCadastro, setCacheTtlMinutos };
});

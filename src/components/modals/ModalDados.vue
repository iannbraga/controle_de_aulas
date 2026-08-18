<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { useAulasStore } from '../../stores/aulas';
import { useMensalidadesStore } from '../../stores/mensalidades';
import { useAuthStore } from '../../stores/auth';
import { useSettingsStore } from '../../stores/settings';
import { importBackupToSupabase } from '../../lib/migration';
import type { Backup } from '../../types/domain';

const ui = useUiStore();
const catalog = useCatalogStore();
const aulasStore = useAulasStore();
const mensalidadesStore = useMensalidadesStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const importInput = ref<HTMLInputElement | null>(null);
const importando = ref(false);

async function togglePermitirCadastro(event: Event): Promise<void> {
  const checked = (event.target as HTMLInputElement).checked;
  const ok = await settings.setPermitirCadastro(checked);
  ui.showToast(ok ? (checked ? 'Criação de conta ativada.' : 'Criação de conta desativada.') : 'Erro ao salvar configuração.');
}

async function alterarCacheTtl(event: Event): Promise<void> {
  const valor = parseInt((event.target as HTMLInputElement).value, 10);
  if (isNaN(valor) || valor < 0) return;
  const ok = await settings.setCacheTtlMinutos(valor);
  ui.showToast(ok ? 'Tempo de cache atualizado.' : 'Erro ao salvar configuração.');
}

function closeDadosModal(): void {
  ui.modals.dados = false;
}

function exportarJSON(): void {
  const dados: Backup = {
    professores: [...catalog.professores],
    alunos: [...catalog.alunos],
    nucleos: [...catalog.nucleos],
    aulas: aulasStore.exportSnapshot(),
    responsaveis: [...catalog.responsaveis],
    mensalidades: [...mensalidadesStore.mensalidades],
    turmas: [...catalog.turmas],
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `xadrez-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ui.showToast('Backup exportado!');
}

function importarJSON(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const dados = JSON.parse(e.target?.result as string);
      if (!dados.professores || !dados.alunos || !dados.nucleos || !dados.aulas) { ui.showToast('Arquivo inválido.'); return; }
      importando.value = true;
      const resumo = await importBackupToSupabase(dados);
      await Promise.all([catalog.fetchAll(), aulasStore.fetchAll(), mensalidadesStore.fetchAll()]);
      ui.modals.dados = false;
      ui.showToast(`Importado: ${resumo.aulas} aulas, ${resumo.professores} profs.`);
    } catch {
      ui.showToast('Erro ao importar o arquivo.');
    } finally {
      importando.value = false;
    }
    (event.target as HTMLInputElement).value = '';
  };
  reader.readAsText(file);
}

function abrirCompartilharMes(): void {
  ui.modals.dados = false;
  ui.modals.compartilhar = true;
}

async function sair(): Promise<void> {
  ui.modals.dados = false;
  await auth.signOut();
}
</script>

<template>
  <div class="modal-backdrop-custom modal" v-if="ui.modals.dados" @click.self="closeDadosModal">
    <div class="modal-sheet modal-content">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-database-fill"></i> Dados</div>
      </div>
      <div class="modal-body">
      <div v-if="auth.user" class="mb-3" style="font-size:.75rem;color:var(--text-muted);margin-top:-8px">
        <i class="bi bi-cloud-check-fill" style="color:var(--chess-green)"></i> Sincronizado com {{ auth.user.email }}
      </div>
      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="text-center p-2" style="flex:1 1 64px;min-width:64px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ aulasStore.aulas.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Aulas</div>
        </div>
        <div class="text-center p-2" style="flex:1 1 64px;min-width:64px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ catalog.professores.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Profs</div>
        </div>
        <div class="text-center p-2" style="flex:1 1 64px;min-width:64px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ catalog.alunos.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Alunos</div>
        </div>
        <div class="text-center p-2" style="flex:1 1 64px;min-width:64px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ catalog.responsaveis.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Resp.</div>
        </div>
      </div>
      <button class="dados-option" @click="exportarJSON">
        <div class="do-icon green"><i class="bi bi-download"></i></div>
        <div>
          <div class="do-title">Exportar backup (.json)</div>
          <div class="do-sub">Salva todos os dados para restauração posterior</div>
        </div>
      </button>
      <button class="dados-option" @click="importInput?.click()" :disabled="importando">
        <div class="do-icon blue"><i class="bi" :class="importando ? 'bi-hourglass-split' : 'bi-upload'"></i></div>
        <div>
          <div class="do-title">{{ importando ? 'Importando...' : 'Importar backup (.json)' }}</div>
          <div class="do-sub">Restaura dados de um arquivo exportado anteriormente</div>
        </div>
      </button>
      <input ref="importInput" type="file" accept=".json,application/json" class="d-none" @change="importarJSON($event)" />
      <button class="dados-option" @click="abrirCompartilharMes">
        <div class="do-icon gold"><i class="bi bi-share"></i></div>
        <div>
          <div class="do-title">Compartilhar fechamento</div>
          <div class="do-sub">Gera texto do mês atual para WhatsApp / e-mail</div>
        </div>
      </button>
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3" style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div>
          <div style="font-size:.85rem;font-weight:600;color:var(--text-primary)"><i class="bi bi-person-plus-fill"></i> Permitir criação de conta</div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">Quando desligado, a tela de login não oferece mais "Criar conta"</div>
        </div>
        <div class="form-check form-switch mb-0 flex-shrink-0">
          <input class="form-check-input" type="checkbox" role="switch" style="width:2.5em;height:1.4em"
            :checked="settings.permitirCadastro" :disabled="settings.saving" @change="togglePermitirCadastro" />
        </div>
      </div>
      <div class="d-flex align-items-center justify-content-between gap-3 mb-3" style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div>
          <div style="font-size:.85rem;font-weight:600;color:var(--text-primary)"><i class="bi bi-clock-history"></i> Validade do cache</div>
          <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">Minutos que os dados ficam salvos neste aparelho antes de consultar o Supabase de novo. Use 0 para desativar o cache.</div>
        </div>
        <input type="number" min="0" step="1" class="form-control text-center flex-shrink-0" style="width:70px"
          :value="settings.cacheTtlMinutos" :disabled="settings.saving" @change="alterarCacheTtl" />
      </div>
      <button class="dados-option" @click="sair">
        <div class="do-icon"><i class="bi bi-box-arrow-right"></i></div>
        <div>
          <div class="do-title">Sair</div>
          <div class="do-sub">Encerra a sessão de {{ auth.user?.email }}</div>
        </div>
      </button>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary w-100" @click="closeDadosModal">Fechar</button>
      </div>
    </div>
  </div>
</template>

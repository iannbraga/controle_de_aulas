<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { useAulasStore } from '../../stores/aulas';
import { useAuthStore } from '../../stores/auth';
import { importBackupToSupabase } from '../../lib/migration';
import type { Backup } from '../../types/domain';

const ui = useUiStore();
const catalog = useCatalogStore();
const aulasStore = useAulasStore();
const auth = useAuthStore();
const importInput = ref<HTMLInputElement | null>(null);
const importando = ref(false);

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
      await Promise.all([catalog.fetchAll(), aulasStore.fetchAll()]);
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

async function limparTudo(): Promise<void> {
  await catalog.limparTudo();
  await aulasStore.limparTudo();
  ui.showToast('Todos os dados foram removidos.');
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
  <div class="modal-backdrop-custom" v-if="ui.modals.dados" @click.self="closeDadosModal">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-database-fill"></i> Dados</div>
      <div v-if="auth.user" style="font-size:.75rem;color:var(--text-muted);margin-bottom:14px;margin-top:-8px">
        <i class="bi bi-cloud-check-fill" style="color:var(--chess-green)"></i> Sincronizado com {{ auth.user.email }}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ aulasStore.aulas.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Aulas</div>
        </div>
        <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ catalog.professores.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Profs</div>
        </div>
        <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
          <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--chess-dark-brown)">{{ catalog.alunos.length }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Alunos</div>
        </div>
        <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
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
      <input ref="importInput" type="file" accept=".json,application/json" style="display:none" @change="importarJSON($event)" />
      <button class="dados-option" @click="abrirCompartilharMes">
        <div class="do-icon gold"><i class="bi bi-share"></i></div>
        <div>
          <div class="do-title">Compartilhar fechamento</div>
          <div class="do-sub">Gera texto do mês atual para WhatsApp / e-mail</div>
        </div>
      </button>
      <button class="dados-option" @click="ui.askConfirm(limparTudo); ui.modals.dados = false" style="border-color:#fdecea">
        <div class="do-icon red"><i class="bi bi-trash3"></i></div>
        <div>
          <div class="do-title" style="color:var(--chess-red)">Limpar todos os dados</div>
          <div class="do-sub">Remove tudo permanentemente da nuvem</div>
        </div>
      </button>
      <button class="dados-option" @click="sair">
        <div class="do-icon"><i class="bi bi-box-arrow-right"></i></div>
        <div>
          <div class="do-title">Sair</div>
          <div class="do-sub">Encerra a sessão de {{ auth.user?.email }}</div>
        </div>
      </button>
      <button class="btn btn-outline-secondary w-100 mt-2" @click="closeDadosModal">Fechar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import type { Professor } from '../../types/domain';

const ui = useUiStore();
const catalog = useCatalogStore();

const mostrarTodos = ref(false);
const professoresExibidos = computed(() => mostrarTodos.value ? catalog.professores : catalog.professoresAtivos);

function delProf(id: string): void {
  ui.askConfirm(async () => { await catalog.delProf(id); ui.showToast('Professor removido.'); });
}

async function toggleAtivo(prof: Professor): Promise<void> {
  try {
    await catalog.salvarProf({ ...prof, ativo: !prof.ativo });
    ui.showToast(prof.ativo ? 'Professor desativado.' : 'Professor reativado.');
  } catch {
    ui.showToast('Erro ao atualizar professor.');
  }
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Professores</div>
      <button class="btn-gold" @click="ui.openModalProf(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div class="d-flex justify-content-end mb-2">
      <button class="btn btn-sm btn-outline-secondary" @click="mostrarTodos = !mostrarTodos">
        <i class="bi" :class="mostrarTodos ? 'bi-funnel-fill' : 'bi-funnel'"></i>
        {{ mostrarTodos ? 'Mostrar só ativos' : 'Mostrar todos' }}
      </button>
    </div>
    <div v-if="catalog.professores.length === 0" class="empty-state"><i class="bi bi-person-x"></i> Nenhum professor cadastrado.</div>
    <div v-else-if="professoresExibidos.length === 0" class="empty-state"><i class="bi bi-person-x"></i> Nenhum professor ativo.</div>
    <div class="card list-group p-0" v-if="professoresExibidos.length > 0">
      <div v-for="prof in professoresExibidos" :key="prof.id" class="list-group-item list-item">
        <div class="avatar rounded-circle">{{ prof.nome[0] }}</div>
        <div class="info">
          <div class="nome">{{ prof.nome }}</div>
          <div class="meta d-flex gap-2 align-items-center mt-1">
            <span class="badge" :class="'badge-nivel nivel-' + prof.nivel">{{ prof.nivel }}</span>
            <span>Peso: <strong>{{ prof.peso }}</strong></span>
            <span class="badge rounded-pill" :class="prof.ativo ? 'text-bg-success' : 'text-bg-danger'" style="font-size:.65rem">{{ prof.ativo ? 'Ativo' : 'Inativo' }}</span>
          </div>
        </div>
        <div class="dropdown">
          <button class="btn-icon" data-bs-toggle="dropdown" aria-expanded="false" title="Ações">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><button class="dropdown-item" @click="toggleAtivo(prof)">
              <i :class="prof.ativo ? 'bi bi-toggle2-on text-success' : 'bi bi-toggle2-off text-danger'"></i> {{ prof.ativo ? 'Desativar' : 'Reativar' }}
            </button></li>
            <li><button class="dropdown-item" @click="ui.openModalProf(prof)"><i class="bi bi-pencil"></i> Editar</button></li>
            <li><button class="dropdown-item text-danger" @click="delProf(prof.id)"><i class="bi bi-trash"></i> Excluir</button></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

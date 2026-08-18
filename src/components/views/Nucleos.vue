<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import type { Nucleo } from '../../types/domain';

const ui = useUiStore();
const catalog = useCatalogStore();

const mostrarTodos = ref(false);
const nucleosExibidos = computed(() => mostrarTodos.value ? catalog.nucleos : catalog.nucleosAtivos);

function delNucleo(id: string): void {
  ui.askConfirm(async () => { await catalog.delNucleo(id); ui.showToast('Núcleo removido.'); });
}

async function toggleAtivo(nucleo: Nucleo): Promise<void> {
  try {
    await catalog.salvarNucleo({ ...nucleo, ativo: !nucleo.ativo });
    ui.showToast(nucleo.ativo ? 'Núcleo desativado.' : 'Núcleo reativado.');
  } catch {
    ui.showToast('Erro ao atualizar núcleo.');
  }
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Núcleos</div>
      <button class="btn-gold" @click="ui.openModalNucleo(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div class="d-flex justify-content-end mb-2">
      <button class="btn btn-sm btn-outline-secondary" @click="mostrarTodos = !mostrarTodos">
        <i class="bi" :class="mostrarTodos ? 'bi-funnel-fill' : 'bi-funnel'"></i>
        {{ mostrarTodos ? 'Mostrar só ativos' : 'Mostrar todos' }}
      </button>
    </div>
    <div v-if="catalog.nucleos.length === 0" class="empty-state"><i class="bi bi-building-x"></i> Nenhum núcleo cadastrado.</div>
    <div v-else-if="nucleosExibidos.length === 0" class="empty-state"><i class="bi bi-building-x"></i> Nenhum núcleo ativo.</div>
    <div class="card p-0" v-if="nucleosExibidos.length > 0">
      <div v-for="(nucleo, idx) in nucleosExibidos" :key="nucleo.id" class="list-item" :style="idx === 0 ? 'border-radius:12px 12px 0 0' : ''">
        <div class="avatar" style="background:var(--chess-dark-brown);color:white;border-color:var(--chess-dark-brown)">
          <i class="bi bi-geo-alt-fill" style="font-size:1rem"></i>
        </div>
        <div class="info">
          <div class="nome">{{ nucleo.nome }}</div>
          <div class="meta mt-1 d-flex flex-wrap gap-2">
            <span v-if="nucleo.endereco"><i class="bi bi-map"></i> {{ nucleo.endereco }}</span>
            <span :class="nucleo.ativo ? 'text-success' : 'text-danger'" style="font-size:.7rem">
              <i :class="nucleo.ativo ? 'bi bi-circle-fill' : 'bi bi-circle'" style="font-size:.5rem"></i>
              {{ nucleo.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div class="meta mt-1" v-if="nucleo.observacoes" style="font-style:italic">{{ nucleo.observacoes }}</div>
        </div>
        <div class="actions">
          <button class="btn-icon" :title="nucleo.ativo ? 'Desativar' : 'Reativar'" @click="toggleAtivo(nucleo)">
            <i :class="nucleo.ativo ? 'bi bi-toggle2-on text-success' : 'bi bi-toggle2-off text-danger'"></i>
          </button>
          <button class="btn-icon" @click="ui.openModalNucleo(nucleo)"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" @click="delNucleo(nucleo.id)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';

const ui = useUiStore();
const catalog = useCatalogStore();

function delProf(id: string): void {
  ui.askConfirm(() => { catalog.delProf(id); ui.showToast('Professor removido.'); });
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Professores</div>
      <button class="btn-gold" @click="ui.openModalProf(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div v-if="catalog.professores.length === 0" class="empty-state"><i class="bi bi-person-x"></i> Nenhum professor cadastrado.</div>
    <div class="card p-0" v-if="catalog.professores.length > 0">
      <div v-for="(prof, idx) in catalog.professores" :key="prof.id" class="list-item" :style="idx === 0 ? 'border-radius:12px 12px 0 0' : ''">
        <div class="avatar">{{ prof.nome[0] }}</div>
        <div class="info">
          <div class="nome">{{ prof.nome }}</div>
          <div class="meta d-flex gap-2 align-items-center mt-1">
            <span :class="'badge-nivel nivel-' + prof.nivel">{{ prof.nivel }}</span>
            <span>Peso: <strong>{{ prof.peso }}</strong></span>
            <span :class="prof.ativo ? 'text-success' : 'text-danger'" style="font-size:.7rem">
              <i :class="prof.ativo ? 'bi bi-circle-fill' : 'bi bi-circle'" style="font-size:.5rem"></i>
              {{ prof.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
        </div>
        <div class="actions">
          <button class="btn-icon" @click="ui.openModalProf(prof)"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" @click="delProf(prof.id)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

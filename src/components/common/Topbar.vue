<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';

const ui = useUiStore();
const aulasStore = useAulasStore();
</script>

<template>
  <div class="topbar">
    <div class="topbar-icon">♟</div>
    <div style="flex:1">
      <div class="topbar-title">Clube de Xadrez</div>
      <div class="topbar-subtitle">Gestão de Aulas</div>
    </div>
    <div v-if="aulasStore.totalPendenciasGeral > 0" class="topbar-badge" @click="ui.view = 'pendencias'" title="Ver pendências">
      <i class="bi bi-exclamation-circle-fill"></i> {{ aulasStore.totalPendenciasGeral }}
    </div>
    <button @click="ui.modals.dados = true"
      style="background:none;border:none;color:#aaa;font-size:1.3rem;cursor:pointer;padding:4px"
      title="Exportar / Importar dados">
      <i class="bi bi-gear"></i>
    </button>
  </div>
</template>

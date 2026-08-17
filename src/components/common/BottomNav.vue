<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';

const ui = useUiStore();
const aulasStore = useAulasStore();
</script>

<template>
  <nav class="bottom-nav">
    <button class="nav-btn" :class="{active: ui.view === 'home'}" @click="ui.view = 'home'">
      <i class="bi bi-house-fill"></i> Home
    </button>
    <button class="nav-btn" :class="{active: ui.view === 'aulas'}" @click="ui.view = 'aulas'">
      <i class="bi bi-journal-text"></i> Aulas
    </button>
    <button class="nav-btn pend-nav" :class="{active: ui.view === 'pendencias'}" @click="ui.view = 'pendencias'">
      <div style="position:relative;display:inline-block">
        <i class="bi bi-exclamation-circle"></i>
        <span v-if="aulasStore.totalPendenciasGeral > 0" class="nav-badge">{{ aulasStore.totalPendenciasGeral }}</span>
      </div>
      Pendências
    </button>
    <button class="nav-btn" :class="{active: ui.view === 'responsaveis'}" @click="ui.view = 'responsaveis'">
      <i class="bi bi-person-badge"></i> Resp.
    </button>
    <button class="nav-btn" :class="{active: ui.view === 'professores'}" @click="ui.view = 'professores'">
      <i class="bi bi-person-badge"></i> Profs
    </button>
    <button class="nav-btn" :class="{active: ui.view === 'alunos'}" @click="ui.view = 'alunos'">
      <i class="bi bi-people"></i> Alunos
    </button>
    <button class="nav-btn" :class="{active: ui.view === 'nucleos'}" @click="ui.view = 'nucleos'">
      <i class="bi bi-geo-alt"></i> Núcleos
    </button>
    <button class="nav-btn" :class="{active: ui.view === 'financeiro'}" @click="ui.view = 'financeiro'">
      <i class="bi bi-cash-coin"></i> Financeiro
    </button>
  </nav>
</template>

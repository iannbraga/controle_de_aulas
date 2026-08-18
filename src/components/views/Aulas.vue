<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { getMonthRef, monthLabel, aulaInMonth, alunosPresentes, formatDate } from '../../lib/helpers';
import { agruparPorNucleo } from '../../lib/reports';
import type { Aula } from '../../types/domain';

const ui = useUiStore();
const aulasStore = useAulasStore();
const catalog = useCatalogStore();

const aulaMesOffset = ref(0);
const aulaViewRef = computed(() => getMonthRef(aulaMesOffset.value));
const aulaMesLabel = computed(() => monthLabel(aulaViewRef.value));

const aulasSortedMes = computed(() => aulasStore.aulasSorted.filter(a => aulaInMonth(a, aulaViewRef.value.year, aulaViewRef.value.month)));
const calc = { total: aulasStore.valorAula, porPeso: aulasStore.valorPorPesoAula };
const aulasSortedMesPorNucleo = computed(() => agruparPorNucleo(aulasSortedMes.value, catalog, calc));

function getProfNomes(aula: Aula): string {
  return aula.professores.map(ap => catalog.getProfNome(ap.professorId)).join(', ') || '—';
}

function openNovaAula(): void {
  aulasStore.openNovaAula();
  ui.modals.aula = true;
}
function editarAula(aula: Aula): void {
  aulasStore.editarAula(aula);
  ui.modals.aula = true;
}
function openFinanceiro(aula: Aula): void {
  aulasStore.openFinanceiro(aula);
  ui.modals.financeiro = true;
}
function delAula(id: string): void {
  ui.askConfirm(async () => { await aulasStore.delAula(id); ui.showToast('Aula removida.'); });
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Aulas</div>
      <button class="btn-gold" @click="openNovaAula"><i class="bi bi-plus-lg"></i> Nova</button>
    </div>
    <div class="mes-nav">
      <button class="mes-btn" @click="aulaMesOffset--">‹</button>
      <div class="mes-label">{{ aulaMesLabel }}</div>
      <button class="mes-btn" @click="aulaMesOffset++" :disabled="aulaMesOffset >= 0">›</button>
    </div>
    <div v-if="aulasSortedMes.length === 0" class="empty-state">
      <i class="bi bi-journal-x"></i> Nenhuma aula neste mês.<br><span style="font-size:.8rem">Toque em "Nova" para começar.</span>
    </div>
    <div v-for="grupo in aulasSortedMesPorNucleo" :key="grupo.nucleoId" class="mb-3">
      <div class="nucleo-group-header"><i class="bi bi-geo-alt-fill"></i><span>{{ grupo.nome }}</span><span class="nucleo-group-total">R$ {{ grupo.total.toFixed(2) }}</span></div>
      <div v-for="aula in grupo.aulas" :key="aula.id" class="aula-card" style="margin-bottom:6px;margin-top:0;border-radius:0 0 8px 8px">
        <div class="aula-card-header">
          <div>
            <div class="aula-date">{{ formatDate(aula.data) }}</div>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <div style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:var(--chess-green)">R$ {{ aulasStore.valorAula(aula).toFixed(2) }}</div>
            <button class="btn-icon" @click="openFinanceiro(aula)"><i class="bi bi-pie-chart-fill" style="color:var(--chess-gold)"></i></button>
            <button class="btn-icon" @click="editarAula(aula)"><i class="bi bi-pencil"></i></button>
            <button class="btn-icon danger" @click="delAula(aula.id)"><i class="bi bi-trash"></i></button>
          </div>
        </div>
        <div class="aula-card-body">
          <div class="aula-stat mb-1"><i class="bi bi-people-fill"></i> {{ getProfNomes(aula) }}</div>
          <div class="aula-stat"><i class="bi bi-person-check"></i> {{ alunosPresentes(aula) }} aluno(s) presente(s)</div>
          <div v-if="aulasStore.aulaTempendencia(aula)" class="aula-stat mt-1" style="color:#e65100">
            <i class="bi bi-exclamation-circle-fill"></i> {{ aulasStore.contarPendenciasAula(aula) }} pendência(s) nesta aula
          </div>
          <div v-if="aula.observacoes" class="aula-stat mt-1"><i class="bi bi-chat-left-text"></i> {{ aula.observacoes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

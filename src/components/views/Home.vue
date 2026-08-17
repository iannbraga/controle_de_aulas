<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { getMonthRef, monthLabel, aulaInMonth, calcTotal, alunosPresentes, formatDate } from '../../lib/helpers';
import { agruparPorNucleo } from '../../lib/reports';

const ui = useUiStore();
const aulasStore = useAulasStore();
const catalog = useCatalogStore();

const mesOffset = ref(0);
const homeRef = computed(() => getMonthRef(mesOffset.value));
const mesAtualLabel = computed(() => monthLabel(homeRef.value));

const aulasMes = computed(() => aulasStore.aulasSorted.filter(a => aulaInMonth(a, homeRef.value.year, homeRef.value.month)));
const aulasMesPorNucleo = computed(() => agruparPorNucleo(aulasMes.value, catalog));
const totalMes = computed(() => aulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
const totalPresencasMes = computed(() => aulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

const pendenciasDoMes = computed(() => {
  const { year, month } = homeRef.value;
  return aulasStore.todasPendencias
    .map(pa => ({ ...pa, aulas: pa.aulas.filter(item => { const [y, m] = item.data.split('-').map(Number); return y === year && m - 1 === month; }) }))
    .filter(pa => pa.aulas.length > 0);
});
const totalPendenciasMes = computed(() => pendenciasDoMes.value.reduce((s, p) => s + p.total, 0));

function getProfNomes(aula: any): string {
  return aula.professores.map((ap: any) => catalog.getProfNome(ap.professorId)).join(', ') || '—';
}
</script>

<template>
  <div class="main-view">
    <div class="mes-nav">
      <button class="mes-btn" @click="mesOffset--">‹</button>
      <div class="mes-label">{{ mesAtualLabel }}</div>
      <button class="mes-btn" @click="mesOffset++" :disabled="mesOffset >= 0">›</button>
    </div>
    <div class="stat-row">
      <div class="stat-mini">
        <div class="sv">{{ aulasMes.length }}</div>
        <div class="sl">Aulas</div>
      </div>
      <div class="stat-mini">
        <div class="sv">{{ totalPresencasMes }}</div>
        <div class="sl">Presenças</div>
      </div>
      <div class="stat-mini">
        <div class="sv">{{ aulasMes.length ? (totalMes / aulasMes.length).toFixed(0) : '0' }}</div>
        <div class="sl">Média/aula</div>
      </div>
    </div>
    <div class="total-box mb-3">
      <div>
        <div style="font-size:.7rem;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Arrecadação do mês</div>
        <div class="t-valor">R$ {{ totalMes.toFixed(2) }}</div>
      </div>
      <i class="bi bi-coin" style="font-size:2rem;color:var(--chess-gold);opacity:.5"></i>
    </div>
    <div v-if="pendenciasDoMes.length > 0" class="pendencia-alert mb-3" @click="ui.view = 'pendencias'">
      <div class="pa-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
      <div class="pa-info">
        <div class="pa-title">{{ pendenciasDoMes.length }} aluno(s) com pendência</div>
        <div class="pa-sub">R$ {{ totalPendenciasMes.toFixed(2) }} em aberto · Toque para ver</div>
      </div>
      <i class="bi bi-chevron-right pa-arrow"></i>
    </div>
    <div class="section-header">
      <div class="section-title">Aulas do mês</div>
      <button class="btn-gold" @click="ui.view = 'aulas'" style="padding:6px 12px;font-size:.78rem">Ver todas</button>
    </div>
    <div v-if="aulasMes.length === 0" class="empty-state"><i class="bi bi-journal-x"></i> Nenhuma aula neste mês.</div>
    <div v-for="grupo in aulasMesPorNucleo" :key="grupo.nucleoId" class="mb-3">
      <div class="nucleo-group-header"><i class="bi bi-geo-alt-fill"></i><span>{{ grupo.nome }}</span><span class="nucleo-group-total">R$ {{ grupo.total.toFixed(2) }}</span></div>
      <div v-for="aula in grupo.aulas" :key="aula.id" class="aula-card" style="margin-bottom:6px;margin-top:0;border-radius:0 0 8px 8px">
        <div class="aula-card-header">
          <div>
            <div class="aula-date">{{ formatDate(aula.data) }}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:var(--chess-green)">R$ {{ calcTotal(aula).toFixed(2) }}</div>
            <div style="font-size:.7rem;color:var(--text-muted)">{{ alunosPresentes(aula) }} alunos</div>
          </div>
        </div>
        <div class="aula-card-body">
          <div class="aula-stat"><i class="bi bi-people-fill"></i> {{ getProfNomes(aula) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

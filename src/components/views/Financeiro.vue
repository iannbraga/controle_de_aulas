<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { useUiStore } from '../../stores/ui';
import { getMonthRef, monthLabel, aulaInMonth, alunosPresentes, formatDate } from '../../lib/helpers';
import { finPorNucleo as calcFinPorNucleo, finFechamento as calcFinFechamento, agruparPorNucleo } from '../../lib/reports';
import type { Aula } from '../../types/domain';

const aulasStore = useAulasStore();
const catalog = useCatalogStore();
const ui = useUiStore();

const finMesOffset = ref(0);
const finAgrupamento = ref<'lista' | 'nucleo'>('lista');

const finRef = computed(() => getMonthRef(finMesOffset.value));
const finMesLabel = computed(() => monthLabel(finRef.value));
const finAulasMes = computed(() => aulasStore.aulasSorted.filter(a => aulaInMonth(a, finRef.value.year, finRef.value.month)));
const calc = { total: aulasStore.valorAula, porPeso: aulasStore.valorPorPesoAula };
const finTotal = computed(() => finAulasMes.value.reduce((s, a) => s + calc.total(a), 0));
const finTotalPresencas = computed(() => finAulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

const finPorNucleo = computed(() => calcFinPorNucleo(finAulasMes.value, catalog, calc));
const finAulasPorNucleo = computed(() => agruparPorNucleo(finAulasMes.value, catalog, calc));
const finFechamento = computed(() => calcFinFechamento(finAulasMes.value, catalog, calc));

function getProfNomes(aula: Aula): string {
  return aula.professores.map(ap => catalog.getProfNome(ap.professorId)).join(', ') || '—';
}
function openFinanceiro(aula: Aula): void {
  aulasStore.openFinanceiro(aula);
  ui.modals.financeiro = true;
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Financeiro</div>
    </div>
    <div class="mes-nav">
      <button class="mes-btn" @click="finMesOffset--">‹</button>
      <div class="mes-label">{{ finMesLabel }}</div>
      <button class="mes-btn" @click="finMesOffset++" :disabled="finMesOffset >= 0">›</button>
    </div>
    <div class="stat-row">
      <div class="stat-mini">
        <div class="sv">{{ finAulasMes.length }}</div>
        <div class="sl">Aulas</div>
      </div>
      <div class="stat-mini">
        <div class="sv">{{ finTotalPresencas }}</div>
        <div class="sl">Presenças</div>
      </div>
      <div class="stat-mini">
        <div class="sv">{{ finAulasMes.length ? (finTotal / finAulasMes.length).toFixed(0) : '0' }}</div>
        <div class="sl">Média R$</div>
      </div>
    </div>
    <div class="total-box mb-3">
      <div>
        <div style="font-size:.7rem;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Total arrecadado</div>
        <div class="t-valor">R$ {{ finTotal.toFixed(2) }}</div>
      </div>
      <i class="bi bi-cash-stack" style="font-size:2rem;color:var(--chess-gold);opacity:.5"></i>
    </div>

    <div class="section-header mt-1">
      <div class="section-title" style="font-size:1.05rem">Por núcleo</div>
    </div>
    <div v-if="finPorNucleo.length === 0" class="empty-state p-3"><span style="font-size:.82rem">Nenhuma aula neste período.</span></div>
    <div class="nucleo-fin-grid mb-3" v-if="finPorNucleo.length > 0">
      <div v-for="nn in finPorNucleo" :key="nn.nucleoId" class="nucleo-fin-card">
        <div class="nfc-header"><i class="bi bi-geo-alt-fill" style="color:var(--chess-gold)"></i><span class="nfc-nome">{{ nn.nome }}</span></div>
        <div class="nfc-valor">R$ {{ nn.total.toFixed(2) }}</div>
        <div class="nfc-meta">{{ nn.numAulas }} aula(s) · {{ nn.numPresencas }} presença(s)</div>
        <div class="nfc-bar-bg">
          <div class="nfc-bar-fill" :style="{width: finTotal > 0 ? (nn.total / finTotal * 100) + '%' : '0%'}"></div>
        </div>
        <div class="nfc-pct">{{ finTotal > 0 ? (nn.total / finTotal * 100).toFixed(0) : 0 }}% do total</div>
      </div>
    </div>

    <div class="section-header mt-1">
      <div class="section-title" style="font-size:1.05rem">Pagamento dos professores</div>
    </div>
    <div v-if="finFechamento.length === 0" class="empty-state p-4"><i class="bi bi-person-x"></i> Nenhum professor participou de aulas neste mês.</div>
    <div v-for="fp in finFechamento" :key="fp.profId" class="prof-fechamento-card mb-2">
      <div class="pfc-header" @click="aulasStore.toggleProfDetalhe(fp.profId)">
        <div class="avatar flex-shrink-0" style="width:38px;height:38px;font-size:.9rem">{{ fp.nome[0] }}</div>
        <div class="flex-fill" style="min-width:0">
          <div class="fp-nome">{{ fp.nome }}</div>
          <div class="fp-detalhe">{{ fp.numAulas }} aula(s) · peso médio {{ fp.pesoMedio.toFixed(2) }}</div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="fp-valor">R$ {{ fp.total.toFixed(2) }}</div>
          <i class="bi" :class="aulasStore.profDetalheAberto[fp.profId] ? 'bi-chevron-up' : 'bi-chevron-down'" style="color:var(--text-muted);font-size:.8rem"></i>
        </div>
      </div>
      <div class="pfc-nucleos" v-if="aulasStore.profDetalheAberto[fp.profId]">
        <div v-for="nn in fp.porNucleo" :key="nn.nucleoId" class="pfc-nucleo-row">
          <div class="pfc-nucleo-left">
            <i class="bi bi-geo-alt-fill" style="color:var(--chess-gold);font-size:.75rem"></i>
            <span class="pfc-nucleo-nome">{{ nn.nome }}</span>
            <span class="pfc-nucleo-meta">{{ nn.numAulas }} aula(s)</span>
          </div>
          <div class="pfc-nucleo-valor">R$ {{ nn.valor.toFixed(2) }}</div>
        </div>
        <div class="pfc-bar-area">
          <div v-for="nn in fp.porNucleo" :key="'bar-' + nn.nucleoId" class="pfc-bar-seg" :style="{width: fp.total > 0 ? (nn.valor / fp.total * 100) + '%' : '0%', background: nn.cor}" :title="nn.nome + ': R$ ' + nn.valor.toFixed(2)"></div>
        </div>
      </div>
    </div>

    <div class="section-header mt-2">
      <div class="section-title" style="font-size:1.05rem">Aulas do período</div>
    </div>
    <div v-if="finAulasMes.length === 0" class="empty-state p-4"><i class="bi bi-journal-x"></i> Nenhuma aula neste mês.</div>
    <div v-if="finAulasMes.length > 0" class="nav nav-pills fin-tabs mb-3">
      <button class="nav-link fin-tab" :class="{active: finAgrupamento === 'lista'}" @click="finAgrupamento = 'lista'"><i class="bi bi-list-ul"></i> Lista</button>
      <button class="nav-link fin-tab" :class="{active: finAgrupamento === 'nucleo'}" @click="finAgrupamento = 'nucleo'"><i class="bi bi-geo-alt"></i> Por núcleo</button>
    </div>
    <div v-if="finAgrupamento === 'lista'">
      <div v-for="aula in finAulasMes" :key="aula.id" class="card aula-card">
        <div class="card-header aula-card-header">
          <div>
            <div class="aula-date">{{ formatDate(aula.data) }}</div>
            <div class="aula-nucleo">{{ catalog.getNucleoNome(aula.nucleoId) }}</div>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <div style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:var(--chess-green)">R$ {{ aulasStore.valorAula(aula).toFixed(2) }}</div>
            <button class="btn-icon" @click="openFinanceiro(aula)"><i class="bi bi-pie-chart-fill" style="color:var(--chess-gold)"></i></button>
          </div>
        </div>
        <div class="card-body aula-card-body">
          <div class="aula-stat mb-1"><i class="bi bi-people-fill"></i> {{ getProfNomes(aula) }}</div>
          <div class="aula-stat"><i class="bi bi-person-check"></i> {{ alunosPresentes(aula) }} aluno(s)</div>
        </div>
      </div>
    </div>
    <div v-if="finAgrupamento === 'nucleo'">
      <div v-for="grupo in finAulasPorNucleo" :key="grupo.nucleoId" class="mb-3">
        <div class="nucleo-group-header"><i class="bi bi-geo-alt-fill"></i><span>{{ grupo.nome }}</span><span class="nucleo-group-total">R$ {{ grupo.total.toFixed(2) }}</span></div>
        <div v-for="aula in grupo.aulas" :key="aula.id" class="card aula-card mb-2 mt-0" style="border-radius:0 0 8px 8px">
          <div class="card-header aula-card-header" style="background:white">
            <div>
              <div class="aula-date">{{ formatDate(aula.data) }}</div>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <div style="font-family:'DM Serif Display',serif;font-size:1rem;color:var(--chess-green)">R$ {{ aulasStore.valorAula(aula).toFixed(2) }}</div>
              <button class="btn-icon" @click="openFinanceiro(aula)"><i class="bi bi-pie-chart-fill" style="color:var(--chess-gold)"></i></button>
            </div>
          </div>
          <div class="card-body aula-card-body py-2 px-3">
            <div class="aula-stat mb-1"><i class="bi bi-people-fill"></i> {{ getProfNomes(aula) }}</div>
            <div class="aula-stat"><i class="bi bi-person-check"></i> {{ alunosPresentes(aula) }} aluno(s)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

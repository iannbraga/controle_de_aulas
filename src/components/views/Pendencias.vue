<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { getMonthRef, monthLabel, formatDate } from '../../lib/helpers';
import type { PendenciaAluno } from '../../types/domain';

const aulasStore = useAulasStore();
const catalog = useCatalogStore();

const pendMesOffset = ref<number | null>(0);
const pendTab = ref<'abertas' | 'pagas'>('abertas');

const pendRef = computed(() => (pendMesOffset.value !== null ? getMonthRef(pendMesOffset.value) : null));
const pendMesLabel = computed(() => (pendRef.value ? monthLabel(pendRef.value) : 'Todas'));

function filtrarPorMes(fonte: PendenciaAluno[]): PendenciaAluno[] {
  if (pendMesOffset.value === null || !pendRef.value) return fonte;
  const { year, month } = pendRef.value;
  return fonte
    .map(pa => ({
      ...pa,
      aulas: pa.aulas.filter(item => {
        const [y, m] = item.data.split('-').map(Number);
        return y === year && m - 1 === month;
      }),
    }))
    .filter(pa => pa.aulas.length > 0)
    .map(pa => ({ ...pa, total: pa.aulas.reduce((s, i) => s + i.valor, 0) }));
}

const pendenciasFiltradas = computed(() => {
  const fonte = pendTab.value === 'pagas' ? aulasStore.todasPendenciasPagas : aulasStore.todasPendencias;
  return filtrarPorMes(fonte);
});

function decrementMes(): void { pendMesOffset.value = pendMesOffset.value === null ? -1 : pendMesOffset.value - 1; }
function incrementMes(): void { if (pendMesOffset.value !== null && pendMesOffset.value < 0) pendMesOffset.value++; }
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Pendências</div>
      <div v-if="aulasStore.totalPendenciasGeralValor > 0" style="font-family:'DM Serif Display',serif;font-size:1rem;color:var(--chess-red)">
        R$ {{ aulasStore.totalPendenciasGeralValor.toFixed(2) }}
      </div>
    </div>

    <div class="nav nav-pills fin-tabs mb-2">
      <button class="nav-link fin-tab" :class="{active: pendTab === 'abertas'}" @click="pendTab = 'abertas'">
        <i class="bi bi-clock-fill"></i> Em aberto
        <span v-if="aulasStore.todasPendencias.length > 0" class="badge rounded-pill ms-1 text-bg-danger">{{ aulasStore.todasPendencias.length }}</span>
      </button>
      <button class="nav-link fin-tab" :class="{active: pendTab === 'pagas'}" @click="pendTab = 'pagas'">
        <i class="bi bi-check-circle-fill"></i> Pagas
      </button>
    </div>

    <div v-if="pendTab === 'abertas' && pendenciasFiltradas.length > 0" class="total-box mb-3" style="padding:12px 16px">
      <div>
        <div style="font-size:.7rem;color:#aaa;text-transform:uppercase;letter-spacing:.05em">Saldo pendente</div>
        <div class="t-valor" style="color:var(--chess-red)">R$ {{ pendenciasFiltradas.reduce((s, p) => s + p.total, 0).toFixed(2) }}</div>
      </div>
      <i class="bi bi-exclamation-circle-fill" style="font-size:2rem;color:var(--chess-red);opacity:.4"></i>
    </div>

    <div class="mes-nav mb-0">
      <button class="mes-btn" @click="decrementMes">‹</button>
      <div class="mes-label">{{ pendMesOffset === null ? 'Todas' : pendMesLabel }}</div>
      <button class="mes-btn" @click="incrementMes" :disabled="pendMesOffset === null || pendMesOffset >= 0">›</button>
    </div>
    <div class="text-center" style="margin-bottom:12px">
      <button class="btn btn-sm" :class="pendMesOffset === null ? 'btn-dark' : 'btn-outline-secondary'" @click="pendMesOffset = null" style="font-size:.72rem;margin-top:6px">Todas as pendências</button>
    </div>

    <div v-if="pendenciasFiltradas.length === 0" class="empty-state">
      <i class="bi bi-check-circle" :style="pendTab === 'pagas' ? 'color:var(--chess-green)' : ''"></i>
      {{ pendTab === 'pagas' ? 'Nenhuma pendência paga' : 'Nenhuma pendência' }} {{ pendMesOffset !== null ? 'neste período' : 'registrada' }}!
    </div>

    <template v-if="pendTab === 'abertas'">
      <div v-for="pa in pendenciasFiltradas" :key="pa.alunoId" class="card pendencia-card">
        <div class="card-header pendencia-card-header">
          <div class="avatar-pend">{{ pa.nome[0] }}</div>
          <div class="flex-fill" style="min-width:0">
            <div class="pend-nome">{{ pa.nome }}</div>
            <div class="pend-meta">{{ pa.aulas.length }} aula(s) em aberto</div>
            <div v-if="pa.responsavel" class="pend-resp">
              <i class="bi bi-person-fill"></i> {{ pa.responsavel }}
              <span v-if="pa.responsavelTel"> · {{ pa.responsavelTel }}</span>
            </div>
          </div>
          <div class="pend-total">R$ {{ pa.total.toFixed(2) }}</div>
        </div>
        <div class="card-body pendencia-card-body">
          <div v-for="item in pa.aulas" :key="item.aulaId" class="pend-aula-item">
            <div>
              <span class="pend-data">{{ formatDate(item.data) }}</span>
              <span class="pend-nucleo">{{ catalog.getNucleoNome(item.nucleoId) }}</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="pend-valor">R$ {{ item.valor.toFixed(2) }}</span>
              <button class="btn-pend-ok" @click="aulasStore.marcarPago(item.aulaId, pa.alunoId)" title="Marcar como pago">
                <i class="bi bi-check-lg"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="card-footer pendencia-card-footer">
          <button class="btn-pend-all" @click="aulasStore.marcarTodosPagos(pa)">
            <i class="bi bi-check-all"></i> Marcar todos como pagos
          </button>
        </div>
      </div>
    </template>

    <template v-if="pendTab === 'pagas'">
      <div v-for="pa in pendenciasFiltradas" :key="'pago-' + pa.alunoId" class="card pendencia-card" style="opacity:.8">
        <div class="card-header pendencia-card-header">
          <div class="avatar-pend" style="background:#e8f5e9;color:#2e7d32;border-color:#a5d6a7">{{ pa.nome[0] }}</div>
          <div class="flex-fill" style="min-width:0">
            <div class="pend-nome">{{ pa.nome }}</div>
            <div class="pend-meta" style="color:var(--chess-green)">{{ pa.aulas.length }} aula(s) paga(s)</div>
            <div v-if="pa.responsavel" class="pend-resp">
              <i class="bi bi-person-fill"></i> {{ pa.responsavel }}
              <span v-if="pa.responsavelTel"> · {{ pa.responsavelTel }}</span>
            </div>
          </div>
          <div class="pend-total" style="color:var(--chess-green)">R$ {{ pa.total.toFixed(2) }}</div>
        </div>
        <div class="card-body pendencia-card-body">
          <div v-for="item in pa.aulas" :key="item.aulaId" class="pend-aula-item">
            <div>
              <span class="pend-data">{{ formatDate(item.data) }}</span>
              <span class="pend-nucleo">{{ catalog.getNucleoNome(item.nucleoId) }}</span>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="pend-valor">R$ {{ item.valor.toFixed(2) }}</span>
              <span class="badge-pago">Pago</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

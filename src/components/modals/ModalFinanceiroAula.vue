<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { useAulasStore } from '../../stores/aulas';
import { calcPesoTotal, formatDate } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();
const aulasStore = useAulasStore();
</script>

<template>
  <div class="modal-backdrop-custom modal" v-if="ui.modals.financeiro && aulasStore.aulaFinanceiro" @click.self="ui.modals.financeiro = false">
    <div class="modal-sheet modal-content" v-if="aulasStore.aulaFinanceiro">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-pie-chart-fill"></i> Divisão Financeira</div>
      </div>
      <div class="modal-body">
      <div class="mb-2" style="font-size:.8rem;color:var(--text-muted)">{{ formatDate(aulasStore.aulaFinanceiro.data) }} — {{ catalog.getNucleoNome(aulasStore.aulaFinanceiro.nucleoId) }}</div>
      <div class="card-header-custom mb-0" style="border-radius:8px 8px 0 0;font-size:.85rem"><i class="bi bi-person-check"></i> Presenças</div>
      <div class="card p-0 mb-3" style="border-radius:0 0 8px 8px">
        <div v-for="aa in aulasStore.aulaFinanceiro.alunos.filter(a => a.presente)" :key="aa.alunoId" class="d-flex justify-content-between align-items-center" style="padding:9px 14px;border-bottom:1px solid var(--border);font-size:.85rem">
          <div>
            <span>{{ catalog.getAlunoNome(aa.alunoId) }}</span>
            <div v-if="catalog.getAlunoResponsavel(aa.alunoId)" style="font-size:.68rem;color:#7b4a00;margin-top:1px">
              <i class="bi bi-person-badge-fill"></i> {{ catalog.getAlunoResponsavel(aa.alunoId) }}
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge" :class="aa.pago ? 'badge-pago' : 'badge-pendente'">{{ aa.pago ? 'Pago' : 'Pendente' }}</span>
            <span style="color:var(--chess-green);font-weight:600">R$ {{ aa.valorPago.toFixed(2) }}</span>
          </div>
        </div>
        <div v-if="!aulasStore.aulaFinanceiro.alunos.some(a => a.presente)" class="text-center" style="padding:12px 14px;font-size:.8rem;color:var(--text-muted)">Nenhum aluno presente.</div>
      </div>
      <div class="total-box mb-3">
        <div>
          <div style="font-size:.7rem;color:#aaa">Total Arrecadado</div>
          <div class="t-valor">R$ {{ aulasStore.valorAula(aulasStore.aulaFinanceiro).toFixed(2) }}</div>
          <div v-if="aulasStore.nucleoEhMensalidade(aulasStore.aulaFinanceiro.nucleoId)" style="font-size:.68rem;color:var(--text-muted);margin-top:2px">
            <i class="bi bi-calendar-check"></i> Rateio da mensalidade do mês
          </div>
        </div>
        <div class="text-end" style="font-size:.75rem;color:#aaa">
          Peso total: {{ calcPesoTotal(aulasStore.aulaFinanceiro).toFixed(2) }}<br>
          Por peso: R$ {{ aulasStore.valorPorPesoAula(aulasStore.aulaFinanceiro).toFixed(2) }}
        </div>
      </div>
      <div class="card-header-custom mb-0" style="border-radius:8px 8px 0 0;font-size:.85rem"><i class="bi bi-cash-coin"></i> Pagamento dos Professores</div>
      <div class="card p-0 mb-3" style="border-radius:0 0 8px 8px">
        <div v-for="ap in aulasStore.aulaFinanceiro.professores" :key="ap.professorId" class="prof-pag-item">
          <div class="avatar" style="width:36px;height:36px;font-size:.85rem">{{ catalog.getProfNome(ap.professorId)[0] }}</div>
          <div class="info">
            <div class="nome" style="font-size:.85rem">{{ catalog.getProfNome(ap.professorId) }}</div>
            <div class="meta">Peso {{ ap.pesoAplicado }}{{ ap.pesoAplicado === 0 ? ' (observador)' : '' }}</div>
          </div>
          <div class="pag-valor">R$ {{ (ap.pesoAplicado * aulasStore.valorPorPesoAula(aulasStore.aulaFinanceiro)).toFixed(2) }}</div>
        </div>
        <div v-if="aulasStore.aulaFinanceiro.professores.length === 0" class="text-center" style="padding:12px 14px;font-size:.8rem;color:var(--text-muted)">Nenhum professor nesta aula.</div>
      </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary w-100" @click="ui.modals.financeiro = false">Fechar</button>
      </div>
    </div>
  </div>
</template>

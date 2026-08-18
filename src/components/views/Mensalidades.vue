<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useCatalogStore } from '../../stores/catalog';
import { useMensalidadesStore } from '../../stores/mensalidades';
import { useAulasStore } from '../../stores/aulas';
import { useUiStore } from '../../stores/ui';
import { getMonthRef, monthLabel, nomeResponsavel, telefoneResponsavel, labelTurma } from '../../lib/helpers';
import type { Mensalidade } from '../../types/domain';

const catalog = useCatalogStore();
const mensalidadesStore = useMensalidadesStore();
const aulasStore = useAulasStore();
const ui = useUiStore();

const mesOffset = ref(0);
const mesRef = computed(() => getMonthRef(mesOffset.value));
const mesLabel = computed(() => monthLabel(mesRef.value));

const mensTab = ref<'abertas' | 'pagas'>('abertas');

// Núcleos recolhidos (accordion) — guardado por id, default expandido.
const colapsados = reactive<Record<string, boolean>>({});
function toggleColapso(nucleoId: string): void {
  colapsados[nucleoId] = !colapsados[nucleoId];
}

// Mostra núcleos de mensalidade mesmo desativados (pra continuar gerenciando
// cobranças pendentes antigas), mas só gera cobrança nova pros ativos.
const nucleosMensalidade = computed(() => catalog.nucleos.filter(n => n.formaCobranca === 'mensalidade'));

// Sempre que o mês ou a lista de núcleos de mensalidade mudar, garante que
// todo aluno ativo matriculado num núcleo ATIVO tenha a cobrança do mês gerada.
watch(
  [mesRef, nucleosMensalidade],
  async ([ref, nucleos]) => {
    for (const n of nucleos.filter(n => n.ativo)) await mensalidadesStore.garantirMes(n.id, ref.year, ref.month);
  },
  { immediate: true },
);

interface LinhaMensalidade extends Mensalidade {
  nome: string;
  responsavel: string | null;
  telefone: string | null;
  turma: string;
}

function linhasDoNucleo(nucleoId: string): LinhaMensalidade[] {
  return mensalidadesStore.getDoMes(nucleoId, mesRef.value.year, mesRef.value.month)
    .map(m => {
      const aluno = catalog.alunos.find(a => a.id === m.alunoId);
      const resp = aluno?.responsavelId ? catalog.responsaveis.find(r => r.id === aluno.responsavelId) : null;
      const turma = aluno?.turmaId ? catalog.turmas.find(t => t.id === aluno.turmaId) : null;
      return {
        ...m,
        nome: aluno?.nome ?? '—',
        responsavel: resp ? nomeResponsavel(resp) : null,
        telefone: (resp ? telefoneResponsavel(resp) : '') || aluno?.telefone || null,
        turma: turma ? labelTurma(turma) : '',
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

const gruposPorNucleo = computed(() => nucleosMensalidade.value.map(n => {
  const linhas = linhasDoNucleo(n.id);
  return {
    nucleo: n,
    linhas,
    total: linhas.reduce((s, l) => s + (l.valor || 0), 0),
    totalPendente: linhas.filter(l => !l.pago).reduce((s, l) => s + (l.valor || 0), 0),
    pendentesCount: linhas.filter(l => !l.pago).length,
  };
}));

const totalGeral = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.total, 0));
const totalPendenteGeral = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.totalPendente, 0));
const totalPendentesCount = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.pendentesCount, 0));
const totalPagasCount = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.linhas.filter(l => l.pago).length, 0));

// Grupos filtrados pela aba atual (Em aberto / Pagas) — só entram núcleos
// que tenham pelo menos uma linha nesse status, pra não poluir a lista.
const gruposExibidos = computed(() => gruposPorNucleo.value
  .map(g => ({ ...g, linhasTab: g.linhas.filter(l => (mensTab.value === 'pagas') === l.pago) }))
  .filter(g => g.linhasTab.length > 0));

async function alternarPago(linha: LinhaMensalidade): Promise<void> {
  const ok = await mensalidadesStore.marcarPago(linha.id, !linha.pago);
  if (!ok) ui.showToast('Erro ao atualizar pagamento.');
}

function cobrarWhats(linha: LinhaMensalidade, nucleoNome: string): void {
  const mes = mesLabel.value.charAt(0).toUpperCase() + mesLabel.value.slice(1);
  const linhas: string[] = [];
  linhas.push(`Mentes em Xeque — Mensalidade ${mes}`);
  linhas.push(`Núcleo: ${nucleoNome}`);
  linhas.push('─'.repeat(28));
  linhas.push(`Aluno: ${linha.nome}`);
  linhas.push(`Valor: R$ ${linha.valor.toFixed(2)}`);
  if (aulasStore.chavePix.trim()) linhas.push(`Chave Pix: ${aulasStore.chavePix.trim()}`);
  const texto = encodeURIComponent(linhas.join('\n'));
  const tel = linha.telefone?.replace(/\D/g, '') || '';
  const url = tel ? `https://wa.me/55${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
  window.open(url, '_blank');
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Mensalidades</div>
      <div v-if="totalPendenteGeral > 0" style="font-family:'DM Serif Display',serif;font-size:1rem;color:var(--chess-red)">
        R$ {{ totalPendenteGeral.toFixed(2) }}
      </div>
    </div>

    <div class="mes-nav mb-3">
      <button class="mes-btn" @click="mesOffset--">‹</button>
      <div class="mes-label">{{ mesLabel }}</div>
      <button class="mes-btn" @click="mesOffset++" :disabled="mesOffset >= 0">›</button>
    </div>

    <div v-if="nucleosMensalidade.length === 0" class="empty-state">
      <i class="bi bi-calendar-x"></i> Nenhum núcleo usa cobrança por mensalidade ainda.<br>
      <span style="font-size:.8rem">Marque "Mensalidade" na forma de cobrança do núcleo (ex: Maple Bear) pra usar esta tela.</span>
    </div>

    <template v-if="nucleosMensalidade.length > 0">
      <div class="d-flex flex-wrap gap-2 mb-3">
        <div class="p-2 text-center" style="flex:1 1 100px;min-width:100px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-dark-brown)">R$ {{ totalGeral.toFixed(2) }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Total do mês</div>
        </div>
        <div class="p-2 text-center" style="flex:1 1 100px;min-width:100px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-red)">{{ totalPendentesCount }}</div>
          <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Pendentes</div>
        </div>
      </div>

      <div class="nav nav-pills fin-tabs mb-2">
        <button class="nav-link fin-tab" :class="{active: mensTab === 'abertas'}" @click="mensTab = 'abertas'">
          <i class="bi bi-clock-fill"></i> Em aberto
          <span v-if="totalPendentesCount > 0" class="badge rounded-pill ms-1 text-bg-danger">{{ totalPendentesCount }}</span>
        </button>
        <button class="nav-link fin-tab" :class="{active: mensTab === 'pagas'}" @click="mensTab = 'pagas'">
          <i class="bi bi-check-circle-fill"></i> Pagas
          <span v-if="totalPagasCount > 0" class="badge rounded-pill ms-1 text-bg-secondary">{{ totalPagasCount }}</span>
        </button>
      </div>

      <div v-if="gruposExibidos.length === 0" class="empty-state">
        <i class="bi bi-check-circle" :style="mensTab === 'pagas' ? '' : 'color:var(--chess-green)'"></i>
        {{ mensTab === 'pagas' ? 'Nenhuma mensalidade paga ainda neste mês.' : 'Nenhuma mensalidade pendente. Tudo em dia!' }}
      </div>

      <div v-for="grupo in gruposExibidos" :key="grupo.nucleo.id" class="mb-3">
        <button class="nucleo-group-header w-100" style="border:none;cursor:pointer" @click="toggleColapso(grupo.nucleo.id)">
          <i class="bi" :class="colapsados[grupo.nucleo.id] ? 'bi-chevron-right' : 'bi-chevron-down'"></i>
          <i class="bi bi-geo-alt-fill"></i><span>{{ grupo.nucleo.nome }}</span>
          <span v-if="mensTab === 'abertas'" style="font-size:.7rem;color:var(--chess-red);margin-left:6px">{{ grupo.pendentesCount }} pendente(s)</span>
          <span class="nucleo-group-total">R$ {{ grupo.total.toFixed(2) }}</span>
        </button>
        <template v-if="!colapsados[grupo.nucleo.id]">
          <div v-for="linha in grupo.linhasTab" :key="linha.id" class="card pendencia-card mb-2 mt-0" style="border-radius:0 0 8px 8px">
            <div class="card-header pendencia-card-header">
              <div class="avatar-pend" :style="linha.pago ? 'background:#e8f5e9;color:#2e7d32;border-color:#a5d6a7' : ''">{{ linha.nome[0] }}</div>
              <div class="flex-fill" style="min-width:0">
                <div class="pend-nome">{{ linha.nome }}<span v-if="linha.turma" style="font-size:.72rem;font-weight:400;color:var(--text-muted)"> · {{ linha.turma }}</span></div>
                <div v-if="linha.responsavel" class="pend-resp">
                  <i class="bi bi-person-fill"></i> {{ linha.responsavel }}
                  <span v-if="linha.telefone"> · {{ linha.telefone }}</span>
                </div>
              </div>
              <div class="pend-total" :style="linha.pago ? 'color:var(--chess-green)' : ''">R$ {{ linha.valor.toFixed(2) }}</div>
              <div class="dropdown">
                <button class="btn-icon" data-bs-toggle="dropdown" aria-expanded="false" title="Ações">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><button class="dropdown-item" @click="alternarPago(linha)">
                    <i class="bi" :class="linha.pago ? 'bi-arrow-counterclockwise' : 'bi-check-circle-fill text-success'"></i> {{ linha.pago ? 'Marcar como pendente' : 'Marcar como pago' }}
                  </button></li>
                  <li><button class="dropdown-item" style="color:#25D366" @click="cobrarWhats(linha, grupo.nucleo.nome)"><i class="bi bi-whatsapp"></i> Cobrar via WhatsApp</button></li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pendencia-card-header {
  position: relative;
}
.pendencia-card-header .dropdown {
  flex-shrink: 0;
}
</style>

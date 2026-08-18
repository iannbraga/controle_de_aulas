<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
  };
}));

const totalGeral = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.total, 0));
const totalPendenteGeral = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.totalPendente, 0));
const totalPendentesCount = computed(() => gruposPorNucleo.value.reduce((s, g) => s + g.linhas.filter(l => !l.pago).length, 0));

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

    <div v-if="nucleosMensalidade.length > 0" style="display:flex;gap:8px;margin-bottom:16px">
      <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
        <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-dark-brown)">R$ {{ totalGeral.toFixed(2) }}</div>
        <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Total do mês</div>
      </div>
      <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">
        <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-red)">{{ totalPendentesCount }}</div>
        <div style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase">Pendentes</div>
      </div>
    </div>

    <div v-for="grupo in gruposPorNucleo" :key="grupo.nucleo.id" class="mb-3">
      <div class="nucleo-group-header">
        <i class="bi bi-geo-alt-fill"></i><span>{{ grupo.nucleo.nome }}</span>
        <span class="nucleo-group-total">R$ {{ grupo.total.toFixed(2) }}</span>
      </div>
      <div v-if="grupo.linhas.length === 0" class="empty-state" style="padding:16px">
        <span style="font-size:.82rem">Nenhum aluno ativo matriculado neste núcleo.</span>
      </div>
      <div v-for="linha in grupo.linhas" :key="linha.id" class="pendencia-card" style="margin-bottom:6px;margin-top:0;border-radius:0 0 8px 8px">
        <div class="pendencia-card-header">
          <div class="avatar-pend" :style="linha.pago ? 'background:#e8f5e9;color:#2e7d32;border-color:#a5d6a7' : ''">{{ linha.nome[0] }}</div>
          <div style="flex:1;min-width:0">
            <div class="pend-nome">{{ linha.nome }}<span v-if="linha.turma" style="font-size:.72rem;font-weight:400;color:var(--text-muted)"> · {{ linha.turma }}</span></div>
            <div v-if="linha.responsavel" class="pend-resp">
              <i class="bi bi-person-fill"></i> {{ linha.responsavel }}
              <span v-if="linha.telefone"> · {{ linha.telefone }}</span>
            </div>
          </div>
          <div class="pend-total" :style="linha.pago ? 'color:var(--chess-green)' : ''">R$ {{ linha.valor.toFixed(2) }}</div>
        </div>
        <div class="pendencia-card-footer" style="display:flex;gap:8px">
          <button class="btn-pend-all" style="flex:1" :style="linha.pago ? 'background:var(--chess-green);color:#fff' : ''" @click="alternarPago(linha)">
            <i class="bi" :class="linha.pago ? 'bi-check-circle-fill' : 'bi-clock-fill'"></i> {{ linha.pago ? 'Pago' : 'Marcar como pago' }}
          </button>
          <button class="btn-pend-all" style="flex:0 0 auto;background:#25D366;color:#fff;border-color:#25D366" @click="cobrarWhats(linha, grupo.nucleo.nome)" title="Cobrar via WhatsApp">
            <i class="bi bi-whatsapp"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

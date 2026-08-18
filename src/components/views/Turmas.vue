<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { DIAS_SEMANA } from '../../lib/helpers';
import type { Nucleo, Turma } from '../../types/domain';

const ui = useUiStore();
const catalog = useCatalogStore();

// Mostra núcleos de mensalidade mesmo desativados (pra continuar gerenciando
// turmas antigas), mas a criação de turma nova só faz sentido nos ativos.
const nucleosMensalidade = computed(() => catalog.nucleos.filter(n => n.formaCobranca === 'mensalidade'));

function turmasDoNucleo(nucleoId: string): Turma[] {
  return catalog.getTurmasDoNucleo(nucleoId).slice().sort((a, b) => {
    const ia = DIAS_SEMANA.findIndex(d => d.value === a.diaSemana);
    const ib = DIAS_SEMANA.findIndex(d => d.value === b.diaSemana);
    return ia !== ib ? ia - ib : a.horario.localeCompare(b.horario);
  });
}

function diaLabel(turma: Turma): string {
  return DIAS_SEMANA.find(d => d.value === turma.diaSemana)?.label ?? turma.diaSemana;
}

function novaTurma(nucleo: Nucleo): void {
  if (nucleo.horarios.length === 0) { ui.showToast('Configure a grade de horários do núcleo antes de criar turmas.'); return; }
  ui.openModalTurma(null, nucleo.id);
}

function editarTurma(turma: Turma): void {
  ui.openModalTurma(turma);
}

function delTurma(turma: Turma): void {
  const vinculados = catalog.getAlunosDaTurma(turma.id);
  ui.askConfirm(async () => {
    await catalog.delTurma(turma.id);
    ui.showToast('Turma removida.');
  }, {
    title: 'Remover turma',
    message: vinculados.length > 0
      ? `Remover essa turma vai desvincular ${vinculados.length} aluno(s) matriculado(s) nela. Continuar?`
      : 'Remover esta turma?',
  });
}

async function toggleAtivo(turma: Turma): Promise<void> {
  try {
    await catalog.salvarTurma({ ...turma, ativo: !turma.ativo });
    ui.showToast(turma.ativo ? 'Turma desativada.' : 'Turma reativada.');
  } catch {
    ui.showToast('Erro ao atualizar turma.');
  }
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Turmas</div>
    </div>

    <div v-if="nucleosMensalidade.length === 0" class="empty-state">
      <i class="bi bi-calendar-x"></i> Nenhum núcleo usa cobrança por mensalidade ainda.<br>
      <span style="font-size:.8rem">Marque "Mensalidade" na forma de cobrança do núcleo pra usar turmas.</span>
    </div>

    <div v-for="nucleo in nucleosMensalidade" :key="nucleo.id" class="mb-3">
      <div class="nucleo-group-header">
        <i class="bi bi-geo-alt-fill"></i><span>{{ nucleo.nome }}</span>
        <button class="btn-icon" style="margin-left:auto" title="Nova turma" @click="novaTurma(nucleo)"><i class="bi bi-plus-circle"></i></button>
      </div>
      <div v-if="turmasDoNucleo(nucleo.id).length === 0" class="empty-state" style="padding:16px">
        <span style="font-size:.82rem">Nenhuma turma cadastrada neste núcleo ainda.</span>
      </div>
      <div v-for="turma in turmasDoNucleo(nucleo.id)" :key="turma.id" class="list-item">
        <div class="avatar" style="background:var(--chess-dark-brown);color:white;border-color:var(--chess-dark-brown)">
          <i class="bi bi-calendar-week" style="font-size:.9rem"></i>
        </div>
        <div class="info">
          <div class="nome">{{ diaLabel(turma) }} — {{ turma.horario }}</div>
          <div class="meta mt-1 d-flex flex-wrap gap-2">
            <span><i class="bi bi-people"></i> {{ catalog.getAlunosDaTurma(turma.id).length }} aluno(s)</span>
            <span :class="turma.ativo ? 'text-success' : 'text-danger'" style="font-size:.7rem">
              <i :class="turma.ativo ? 'bi bi-circle-fill' : 'bi bi-circle'" style="font-size:.5rem"></i>
              {{ turma.ativo ? 'Ativa' : 'Inativa' }}
            </span>
          </div>
        </div>
        <div class="actions">
          <button class="btn-icon" :title="turma.ativo ? 'Desativar' : 'Reativar'" @click="toggleAtivo(turma)">
            <i :class="turma.ativo ? 'bi bi-toggle2-on text-success' : 'bi bi-toggle2-off text-danger'"></i>
          </button>
          <button class="btn-icon" @click="editarTurma(turma)"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" @click="delTurma(turma)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

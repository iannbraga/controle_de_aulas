<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { DIAS_SEMANA } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();

const nucleo = computed(() => catalog.nucleos.find(n => n.id === ui.formTurma.nucleoId));

async function salvar(): Promise<void> {
  if (!ui.formTurma.nucleoId) { ui.showToast('Núcleo não identificado.'); return; }
  if (!ui.formTurma.diaSemana) { ui.showToast('Selecione o dia da semana.'); return; }
  if (!ui.formTurma.horario) { ui.showToast('Selecione o horário.'); return; }
  try {
    await catalog.salvarTurma({ ...ui.formTurma });
    ui.modals.turma = false;
    ui.showToast('Turma salva!');
  } catch {
    ui.showToast('Erro ao salvar turma.');
  }
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.turma" @click.self="ui.modals.turma = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-calendar-week-fill"></i> {{ ui.formTurma.id ? 'Editar' : 'Nova' }} Turma</div>
      <div v-if="nucleo" style="font-size:0.8rem;color:var(--text-muted);margin-bottom:14px">
        <i class="bi bi-geo-alt-fill"></i> {{ nucleo.nome }}
      </div>
      <div class="mb-3">
        <label class="form-label">Dia da semana</label>
        <select class="form-select" v-model="ui.formTurma.diaSemana">
          <option v-for="d in DIAS_SEMANA" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">Horário</label>
        <select class="form-select" v-model="ui.formTurma.horario" v-if="nucleo && nucleo.horarios.length > 0">
          <option value="">Selecionar horário...</option>
          <option v-for="h in nucleo.horarios" :key="h" :value="h">{{ h }}</option>
        </select>
        <div v-else style="font-size:0.8rem;color:var(--chess-red)">
          <i class="bi bi-exclamation-circle"></i> Este núcleo ainda não tem uma grade de horários. Configure em "Editar núcleo" antes de criar turmas.
        </div>
      </div>
      <div class="mb-4">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" v-model="ui.formTurma.ativo" id="turmaAtiva" />
          <label class="form-check-label" for="turmaAtiva">Ativa</label>
        </div>
        <div style="font-size:0.73rem;color:var(--text-muted);margin-top:4px">
          <i class="bi bi-info-circle"></i> Turmas inativas somem das opções de matrícula, mas os alunos já matriculados continuam vinculados.
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.turma = false">Cancelar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
      </div>
    </div>
  </div>
</template>

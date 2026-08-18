<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { PESO_SUGERIDO } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();

function applyPesoSugerido(): void {
  ui.formProf.peso = PESO_SUGERIDO[ui.formProf.nivel] ?? 1;
}
async function salvar(): Promise<void> {
  if (!ui.formProf.nome.trim()) { ui.showToast('Informe o nome do professor.'); return; }
  try {
    await catalog.salvarProf({ ...ui.formProf });
    ui.modals.prof = false;
    ui.showToast('Professor salvo!');
  } catch {
    ui.showToast('Erro ao salvar professor.');
  }
}
</script>

<template>
  <div class="modal-backdrop-custom modal" v-if="ui.modals.prof" @click.self="ui.modals.prof = false">
    <div class="modal-sheet modal-content">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-person-badge-fill"></i> {{ ui.formProf.id ? 'Editar' : 'Novo' }} Professor</div>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">Nome</label>
          <input class="form-control" v-model="ui.formProf.nome" placeholder="Nome completo" />
        </div>
        <div class="mb-3">
          <label class="form-label">Nível</label>
          <select class="form-select" v-model="ui.formProf.nivel" @change="applyPesoSugerido">
            <option value="principal">Principal (Peso 2)</option>
            <option value="professor">Professor (Peso 1.5)</option>
            <option value="auxiliar">Auxiliar (Peso 1)</option>
            <option value="trainee">Trainee (Peso 0.5)</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Peso financeiro</label>
          <div class="peso-stepper">
            <button class="peso-btn" @click="ui.formProf.peso = Math.max(0, +(ui.formProf.peso - 0.25).toFixed(2))">−</button>
            <div class="peso-value">{{ ui.formProf.peso }}</div>
            <button class="peso-btn" @click="ui.formProf.peso = +(ui.formProf.peso + 0.25).toFixed(2)">+</button>
          </div>
          <div v-if="ui.formProf.peso === 0" class="mt-2" style="font-size:.75rem;color:var(--text-muted)">
            <i class="bi bi-info-circle"></i> Peso 0 = apenas observador, não recebe pagamento.
          </div>
        </div>
        <div class="mb-0">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" v-model="ui.formProf.ativo" id="profAtivo" />
            <label class="form-check-label" for="profAtivo">Ativo</label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.prof = false">Cancelar</button>
          <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>

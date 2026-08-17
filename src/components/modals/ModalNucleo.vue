<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';

const ui = useUiStore();
const catalog = useCatalogStore();

async function salvar(): Promise<void> {
  if (!ui.formNucleo.nome.trim()) { ui.showToast('Informe o nome do núcleo.'); return; }
  try {
    await catalog.salvarNucleo({ ...ui.formNucleo });
    ui.modals.nucleo = false;
    ui.showToast('Núcleo salvo!');
  } catch {
    ui.showToast('Erro ao salvar núcleo.');
  }
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.nucleo" @click.self="ui.modals.nucleo = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-geo-alt-fill"></i> {{ ui.formNucleo.id ? 'Editar' : 'Novo' }} Núcleo</div>
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formNucleo.nome" placeholder="Ex: Cesar Maingha" />
      </div>
      <div class="mb-3">
        <label class="form-label">Endereço (opcional)</label>
        <input class="form-control" v-model="ui.formNucleo.endereco" placeholder="Rua, bairro..." />
      </div>
      <div class="mb-4">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="ui.formNucleo.observacoes" rows="2"></textarea>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.nucleo = false">Cancelar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
      </div>
    </div>
  </div>
</template>

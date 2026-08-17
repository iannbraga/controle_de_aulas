<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';

const ui = useUiStore();
const catalog = useCatalogStore();

function salvar(): void {
  if (!ui.formResp.nome.trim()) { ui.showToast('Informe o nome do responsável.'); return; }
  catalog.salvarResp({ ...ui.formResp });
  ui.modals.resp = false;
  ui.showToast('Responsável salvo!');
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.resp" @click.self="ui.modals.resp = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-person-badge-fill"></i> {{ ui.formResp.id ? 'Editar' : 'Novo' }} Responsável</div>
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formResp.nome" placeholder="Nome completo" />
      </div>
      <div class="mb-3">
        <label class="form-label">Telefone</label>
        <input class="form-control" v-model="ui.formResp.telefone" placeholder="(00) 00000-0000" type="tel" />
      </div>
      <div class="mb-3">
        <label class="form-label">E-mail (opcional)</label>
        <input class="form-control" v-model="ui.formResp.email" placeholder="email@exemplo.com" type="email" />
      </div>
      <div class="mb-3">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="ui.formResp.observacoes" rows="2" placeholder="Ex: pai do João e da Maria"></textarea>
      </div>
      <div class="mb-4">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" v-model="ui.formResp.ativo" id="respAtivo" />
          <label class="form-check-label" for="respAtivo">Ativo</label>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.resp = false">Cancelar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
      </div>
    </div>
  </div>
</template>

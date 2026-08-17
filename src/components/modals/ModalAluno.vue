<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';

const ui = useUiStore();
const catalog = useCatalogStore();

function salvar(): void {
  if (!ui.formAluno.nome.trim()) { ui.showToast('Informe o nome do aluno.'); return; }
  catalog.salvarAluno({ ...ui.formAluno });
  ui.modals.aluno = false;
  ui.showToast('Aluno salvo!');
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.aluno" @click.self="ui.modals.aluno = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-person-fill"></i> {{ ui.formAluno.id ? 'Editar' : 'Novo' }} Aluno</div>
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formAluno.nome" placeholder="Nome completo" />
      </div>
      <div class="mb-3">
        <label class="form-label">Telefone (opcional)</label>
        <input class="form-control" v-model="ui.formAluno.telefone" placeholder="(00) 00000-0000" type="tel" />
      </div>
      <div class="mb-3">
        <label class="form-label">Valor padrão da aula (R$)</label>
        <input class="form-control" v-model.number="ui.formAluno.valorPadrao" type="number" min="0" step="0.50" placeholder="15.00" />
      </div>
      <div class="mb-3">
        <label class="form-label">Responsável (opcional)</label>
        <select class="form-select" v-model="ui.formAluno.responsavelId">
          <option value="">Sem responsável</option>
          <option v-for="r in catalog.responsaveis" :key="r.id" :value="r.id">{{ r.nome }}{{ r.telefone ? ' — ' + r.telefone : '' }}</option>
        </select>
        <div style="font-size:0.73rem;color:var(--text-muted);margin-top:4px">
          <i class="bi bi-info-circle"></i> Vinculando um responsável, ele aparecerá no fechamento de cobrança.
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="ui.formAluno.observacoes" rows="2" placeholder="Ex: desconto, bolsista..."></textarea>
      </div>
      <div class="mb-4">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" v-model="ui.formAluno.ativo" id="alunoAtivo" />
          <label class="form-check-label" for="alunoAtivo">Ativo</label>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.aluno = false">Cancelar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { nomeResponsavel, telefoneResponsavel, labelTurma } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();

const nucleoSelecionado = computed(() => catalog.nucleos.find(n => n.id === ui.formAluno.nucleoId));
const nucleoEhMensalidade = computed(() => nucleoSelecionado.value?.formaCobranca === 'mensalidade');

// Núcleos ativos + o já vinculado a este aluno, mesmo que tenha sido
// desativado depois (pra não sumir a opção ao editar o cadastro).
const nucleosForm = computed(() => {
  const atual = nucleoSelecionado.value && !nucleoSelecionado.value.ativo ? nucleoSelecionado.value : null;
  return atual ? [...catalog.nucleosAtivos, atual] : catalog.nucleosAtivos;
});

// Turmas ativas + a já vinculada a este aluno, mesmo que tenha sido
// desativada depois (pra não sumir a opção ao editar o cadastro).
const turmasForm = computed(() => {
  if (!ui.formAluno.nucleoId) return [];
  const doNucleo = catalog.getTurmasDoNucleo(ui.formAluno.nucleoId);
  const atual = doNucleo.find(t => t.id === ui.formAluno.turmaId && !t.ativo);
  const ativas = doNucleo.filter(t => t.ativo);
  return atual ? [...ativas, atual] : ativas;
});

// Se o núcleo mudar, a turma escolhida antes (de outro núcleo) deixa de valer.
watch(() => ui.formAluno.nucleoId, () => {
  if (!turmasForm.value.some(t => t.id === ui.formAluno.turmaId)) ui.formAluno.turmaId = '';
});

async function salvar(): Promise<void> {
  if (!ui.formAluno.nome.trim()) { ui.showToast('Informe o nome do aluno.'); return; }
  try {
    await catalog.salvarAluno({ ...ui.formAluno });
    ui.modals.aluno = false;
    ui.showToast('Aluno salvo!');
  } catch {
    ui.showToast('Erro ao salvar aluno.');
  }
}
</script>

<template>
  <div class="modal-backdrop-custom modal" v-if="ui.modals.aluno" @click.self="ui.modals.aluno = false">
    <div class="modal-sheet modal-content">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-person-fill"></i> {{ ui.formAluno.id ? 'Editar' : 'Novo' }} Aluno</div>
      </div>
      <div class="modal-body">
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formAluno.nome" placeholder="Nome completo" />
      </div>
      <div class="mb-3">
        <label class="form-label">Telefone (opcional)</label>
        <input class="form-control" v-model="ui.formAluno.telefone" placeholder="(00) 00000-0000" type="tel" />
      </div>
      <div class="mb-3">
        <label class="form-label">Núcleo de matrícula (opcional)</label>
        <select class="form-select" v-model="ui.formAluno.nucleoId">
          <option value="">Sem núcleo fixo</option>
          <option v-for="n in nucleosForm" :key="n.id" :value="n.id">{{ n.nome }}{{ n.formaCobranca === 'mensalidade' ? ' (mensalidade)' : '' }}{{ !n.ativo ? ' (inativo)' : '' }}</option>
        </select>
        <div class="mt-1" style="font-size:0.73rem;color:var(--text-muted)">
          <i class="bi bi-info-circle"></i> Só é usado pra saber onde gerar a cobrança de mensalidade — não limita em quais núcleos ele tem aula.
        </div>
      </div>
      <div class="mb-3" v-if="!nucleoEhMensalidade">
        <label class="form-label">Valor padrão da aula (R$)</label>
        <input class="form-control" v-model.number="ui.formAluno.valorPadrao" type="number" min="0" step="0.50" placeholder="15.00" />
      </div>
      <div class="mb-3" v-else>
        <label class="form-label">Valor da mensalidade (R$)</label>
        <input class="form-control" v-model.number="ui.formAluno.valorMensalidade" type="number" min="0" step="0.50" placeholder="150.00" />
      </div>
      <div class="mb-3" v-if="nucleoEhMensalidade">
        <label class="form-label">Turma</label>
        <select class="form-select" v-model="ui.formAluno.turmaId" v-if="turmasForm.length > 0">
          <option value="">Selecionar turma...</option>
          <option v-for="t in turmasForm" :key="t.id" :value="t.id">{{ labelTurma(t) }}{{ !t.ativo ? ' (inativa)' : '' }}</option>
        </select>
        <div v-else style="font-size:0.8rem;color:var(--chess-red)">
          <i class="bi bi-exclamation-circle"></i> Este núcleo ainda não tem turmas cadastradas. Crie uma na tela "Turmas".
        </div>
        <div class="mt-1" style="font-size:0.73rem;color:var(--text-muted)">
          <i class="bi bi-info-circle"></i> 1 aula fixa de 1h por semana, no dia e horário da turma.
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Responsável (opcional)</label>
        <select class="form-select" v-model="ui.formAluno.responsavelId">
          <option value="">Sem responsável</option>
          <option v-for="r in catalog.responsaveis" :key="r.id" :value="r.id">{{ nomeResponsavel(r) }}{{ telefoneResponsavel(r) ? ' — ' + telefoneResponsavel(r) : '' }}</option>
        </select>
        <div class="mt-1" style="font-size:0.73rem;color:var(--text-muted)">
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
      </div>
      <div class="modal-footer">
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.aluno = false">Cancelar</button>
          <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>

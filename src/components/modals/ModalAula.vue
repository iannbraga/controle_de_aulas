<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { useAulasStore } from '../../stores/aulas';
import { labelTurma } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();
const aulasStore = useAulasStore();

// Núcleos de mensalidade cobram adiantado (ver Mensalidades) — aqui só
// marcamos presença, sem pedir valor/status de pagamento por aluno.
const nucleoEhMensalidade = computed(() => aulasStore.nucleoEhMensalidade(aulasStore.form.nucleoId));

// Núcleos ativos + o núcleo já selecionado nesta aula, mesmo que tenha sido
// desativado depois (pra não sumir a opção ao editar uma aula antiga).
const nucleosForm = computed(() => {
  const atual = catalog.nucleos.find(n => n.id === aulasStore.form.nucleoId && !n.ativo);
  return atual ? [...catalog.nucleosAtivos, atual] : catalog.nucleosAtivos;
});

// Turmas do núcleo selecionado (só relevante em núcleos de mensalidade):
// ativas + a já escolhida nesta aula, mesmo que tenha sido desativada depois.
const turmasForm = computed(() => {
  if (!aulasStore.form.nucleoId) return [];
  const doNucleo = catalog.getTurmasDoNucleo(aulasStore.form.nucleoId);
  const atual = doNucleo.find(t => t.id === aulasStore.form.turmaId && !t.ativo);
  const ativas = doNucleo.filter(t => t.ativo);
  return atual ? [...ativas, atual] : ativas;
});

// Ao trocar o núcleo manualmente, a turma escolhida antes deixa de valer.
function onChangeNucleo(): void {
  aulasStore.form.turmaId = '';
}

// Alunos a mostrar na lista de presença:
// - núcleo por aula: todos os alunos ativos (+ inativos já presentes nesta aula).
// - núcleo de mensalidade: só os matriculados na turma escolhida (+ os já
//   presentes nesta aula, mesmo que não sejam mais dessa turma, pra não sumir
//   um registro antigo ao editar).
const alunosAtivosForm = computed(() => {
  const idsNaAula = aulasStore.form.alunos.map(a => a.alunoId);
  const extras = catalog.alunos.filter(a => !a.ativo && idsNaAula.includes(a.id));
  if (nucleoEhMensalidade.value) {
    if (!aulasStore.form.turmaId) return extras;
    const daTurma = catalog.alunosAtivos.filter(a => a.turmaId === aulasStore.form.turmaId);
    const outrosJaNaAula = catalog.alunosAtivos.filter(a => a.turmaId !== aulasStore.form.turmaId && idsNaAula.includes(a.id));
    return [...daTurma, ...outrosJaNaAula, ...extras];
  }
  return [...catalog.alunosAtivos, ...extras];
});

function onCheckAluno(alunoId: string, valorPadrao: number, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  aulasStore.toggleAlunoAula(alunoId, valorPadrao, checked);
}
function onValorInput(alunoId: string, event: Event): void {
  aulasStore.setAlunoValor(alunoId, (event.target as HTMLInputElement).value);
}

async function salvar(): Promise<void> {
  const res = await aulasStore.salvarAula();
  if (!res.ok) { ui.showToast(res.msg!); return; }
  ui.modals.aula = false;
  ui.showToast('Aula registrada!');
}
</script>

<template>
  <div class="modal-backdrop-custom modal" v-if="ui.modals.aula" @click.self="ui.modals.aula = false">
    <div class="modal-sheet modal-content">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-journal-plus"></i> {{ aulasStore.form.id ? 'Editar' : 'Registrar' }} Aula</div>
      </div>
      <div class="modal-body">
      <div class="mb-3">
        <label class="form-label">Data</label>
        <input class="form-control" type="date" v-model="aulasStore.form.data" />
      </div>
      <div class="mb-3">
        <label class="form-label">Núcleo</label>
        <select class="form-select" v-model="aulasStore.form.nucleoId" @change="onChangeNucleo">
          <option value="">Selecionar núcleo...</option>
          <option v-for="n in nucleosForm" :key="n.id" :value="n.id">{{ n.nome }}{{ !n.ativo ? ' (inativo)' : '' }}</option>
        </select>
      </div>
      <div class="mb-3" v-if="nucleoEhMensalidade">
        <label class="form-label">Turma</label>
        <select class="form-select" v-model="aulasStore.form.turmaId" v-if="turmasForm.length > 0">
          <option value="">Selecionar turma...</option>
          <option v-for="t in turmasForm" :key="t.id" :value="t.id">{{ labelTurma(t) }}{{ !t.ativo ? ' (inativa)' : '' }}</option>
        </select>
        <div v-else style="font-size:0.8rem;color:var(--chess-red)">
          <i class="bi bi-exclamation-circle"></i> Este núcleo ainda não tem turmas cadastradas.
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label d-block">Professores presentes</label>
        <div class="toggle-group">
          <span v-for="prof in catalog.professoresAtivos" :key="prof.id" class="toggle-pill" :class="{selected: aulasStore.aulaHasProf(prof.id)}" @click="aulasStore.toggleProfAula(prof.id, prof.peso)">{{ prof.nome }}</span>
        </div>
        <div class="mt-2" v-if="aulasStore.form.professores.length > 0">
          <div v-for="ap in aulasStore.form.professores" :key="ap.professorId" class="mt-1" style="font-size:.78rem;color:var(--text-secondary)">
            <strong>{{ catalog.getProfNome(ap.professorId) }}</strong> — peso {{ ap.pesoAplicado }}
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">{{ nucleoEhMensalidade ? 'Alunos — presença' : 'Alunos — presença e pagamento' }}</label>
        <div v-if="nucleoEhMensalidade" style="font-size:.72rem;color:var(--text-muted);margin-bottom:6px">
          <i class="bi bi-info-circle"></i> Este núcleo cobra por mensalidade adiantada — a cobrança é feita na tela "Mensalidades", não por aula.
        </div>
        <div v-if="nucleoEhMensalidade && !aulasStore.form.turmaId" style="font-size:.82rem;color:var(--text-muted)">Selecione a turma acima para ver os alunos.</div>
        <div v-else-if="catalog.alunosAtivos.length === 0" style="font-size:.82rem;color:var(--text-muted)">Nenhum aluno ativo cadastrado.</div>
        <div v-else-if="alunosAtivosForm.length === 0" style="font-size:.82rem;color:var(--text-muted)">Nenhum aluno matriculado nesta turma.</div>
        <div v-for="al in alunosAtivosForm" :key="al.id" class="aluno-check-item">
          <input type="checkbox" class="form-check-input" style="width:20px;height:20px" :id="'al-' + al.id" :checked="aulasStore.aulaAlunoPresente(al.id)" @change="onCheckAluno(al.id, al.valorPadrao, $event)" />
          <label :for="'al-' + al.id" class="nome">{{ al.nome }}</label>
          <template v-if="!nucleoEhMensalidade">
            <div class="pag-status-toggle" v-if="aulasStore.aulaAlunoPresente(al.id)">
              <button class="pst-btn" :class="{active: aulasStore.getAlunoPago(al.id)}" @click="aulasStore.setAlunoPago(al.id, true)" title="Pago"><i class="bi bi-check-circle-fill"></i></button>
              <button class="pst-btn pending" :class="{active: !aulasStore.getAlunoPago(al.id)}" @click="aulasStore.setAlunoPago(al.id, false)" title="Pendente"><i class="bi bi-clock-fill"></i></button>
            </div>
            <input class="valor-input" type="number" min="0" step="0.50" :value="aulasStore.getAlunoValor(al.id)" @input="onValorInput(al.id, $event)" :disabled="!aulasStore.aulaAlunoPresente(al.id)" placeholder="R$" />
          </template>
        </div>
      </div>
      <div class="total-box mb-3" v-if="!nucleoEhMensalidade && aulasStore.form.alunos.some(a => a.presente)">
        <div>
          <div style="font-size:.7rem;color:#aaa">Total desta aula</div>
          <div class="t-valor">R$ {{ aulasStore.calcTotalForm().toFixed(2) }}</div>
        </div>
        <div class="text-end" style="font-size:.75rem;color:#ccc" v-if="aulasStore.form.professores.length">
          {{ aulasStore.form.professores.length }} prof(s)
        </div>
      </div>
      <div class="mb-4">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="aulasStore.form.observacoes" rows="2"></textarea>
      </div>
      </div>
      <div class="modal-footer">
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.aula = false">Cancelar</button>
          <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar Aula</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { useAulasStore } from '../../stores/aulas';

const ui = useUiStore();
const catalog = useCatalogStore();
const aulasStore = useAulasStore();

// Alunos ativos + quaisquer alunos inativos que já façam parte desta aula
// (mesma regra do app original, para não "sumir" um aluno inativado depois do registro).
const alunosAtivosForm = computed(() => {
  const idsNaAula = aulasStore.form.alunos.map(a => a.alunoId);
  const extras = catalog.alunos.filter(a => !a.ativo && idsNaAula.includes(a.id));
  return [...catalog.alunosAtivos, ...extras];
});

function onCheckAluno(alunoId: string, valorPadrao: number, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  aulasStore.toggleAlunoAula(alunoId, valorPadrao, checked);
}
function onValorInput(alunoId: string, event: Event): void {
  aulasStore.setAlunoValor(alunoId, (event.target as HTMLInputElement).value);
}

function salvar(): void {
  const res = aulasStore.salvarAula();
  if (!res.ok) { ui.showToast(res.msg!); return; }
  ui.modals.aula = false;
  ui.showToast('Aula registrada!');
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.aula" @click.self="ui.modals.aula = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-journal-plus"></i> {{ aulasStore.form.id ? 'Editar' : 'Registrar' }} Aula</div>
      <div class="mb-3">
        <label class="form-label">Data</label>
        <input class="form-control" type="date" v-model="aulasStore.form.data" />
      </div>
      <div class="mb-3">
        <label class="form-label">Núcleo</label>
        <select class="form-select" v-model="aulasStore.form.nucleoId">
          <option value="">Selecionar núcleo...</option>
          <option v-for="n in catalog.nucleos" :key="n.id" :value="n.id">{{ n.nome }}</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label d-block">Professores presentes</label>
        <div class="toggle-group">
          <span v-for="prof in catalog.professoresAtivos" :key="prof.id" class="toggle-pill" :class="{selected: aulasStore.aulaHasProf(prof.id)}" @click="aulasStore.toggleProfAula(prof.id, prof.peso)">{{ prof.nome }}</span>
        </div>
        <div class="mt-2" v-if="aulasStore.form.professores.length > 0">
          <div v-for="ap in aulasStore.form.professores" :key="ap.professorId" style="font-size:.78rem;color:var(--text-secondary);margin-top:4px">
            <strong>{{ catalog.getProfNome(ap.professorId) }}</strong> — peso {{ ap.pesoAplicado }}
          </div>
        </div>
      </div>
      <div class="mb-3">
        <label class="form-label">Alunos — presença e pagamento</label>
        <div v-if="catalog.alunosAtivos.length === 0" style="font-size:.82rem;color:var(--text-muted)">Nenhum aluno ativo cadastrado.</div>
        <div v-for="al in alunosAtivosForm" :key="al.id" class="aluno-check-item">
          <input type="checkbox" class="form-check-input" style="width:20px;height:20px" :id="'al-' + al.id" :checked="aulasStore.aulaAlunoPresente(al.id)" @change="onCheckAluno(al.id, al.valorPadrao, $event)" />
          <label :for="'al-' + al.id" class="nome">{{ al.nome }}</label>
          <div class="pag-status-toggle" v-if="aulasStore.aulaAlunoPresente(al.id)">
            <button class="pst-btn" :class="{active: aulasStore.getAlunoPago(al.id)}" @click="aulasStore.setAlunoPago(al.id, true)" title="Pago"><i class="bi bi-check-circle-fill"></i></button>
            <button class="pst-btn pending" :class="{active: !aulasStore.getAlunoPago(al.id)}" @click="aulasStore.setAlunoPago(al.id, false)" title="Pendente"><i class="bi bi-clock-fill"></i></button>
          </div>
          <input class="valor-input" type="number" min="0" step="0.50" :value="aulasStore.getAlunoValor(al.id)" @input="onValorInput(al.id, $event)" :disabled="!aulasStore.aulaAlunoPresente(al.id)" placeholder="R$" />
        </div>
      </div>
      <div class="total-box mb-3" v-if="aulasStore.form.alunos.some(a => a.presente)">
        <div>
          <div style="font-size:.7rem;color:#aaa">Total desta aula</div>
          <div class="t-valor">R$ {{ aulasStore.calcTotalForm().toFixed(2) }}</div>
        </div>
        <div style="font-size:.75rem;color:#ccc;text-align:right" v-if="aulasStore.form.professores.length">
          {{ aulasStore.form.professores.length }} prof(s)
        </div>
      </div>
      <div class="mb-4">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="aulasStore.form.observacoes" rows="2"></textarea>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.aula = false">Cancelar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar Aula</button>
      </div>
    </div>
  </div>
</template>

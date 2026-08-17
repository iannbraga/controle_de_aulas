<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { useAulasStore } from '../../stores/aulas';

const ui = useUiStore();
const catalog = useCatalogStore();
const aulasStore = useAulasStore();

function delAluno(id: string): void {
  ui.askConfirm(async () => { await catalog.delAluno(id); ui.showToast('Aluno removido.'); });
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Alunos</div>
      <button class="btn-gold" @click="ui.openModalAluno(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div v-if="catalog.alunos.length === 0" class="empty-state"><i class="bi bi-person-x"></i> Nenhum aluno cadastrado.</div>
    <div class="card p-0" v-if="catalog.alunos.length > 0">
      <div v-for="(aluno, idx) in catalog.alunos" :key="aluno.id" class="list-item" :style="idx === 0 ? 'border-radius:12px 12px 0 0' : ''">
        <div class="avatar">{{ aluno.nome[0] }}</div>
        <div class="info">
          <div class="nome">{{ aluno.nome }}</div>
          <div class="meta mt-1 d-flex flex-wrap gap-2">
            <span>R$ {{ aluno.valorPadrao.toFixed(2) }}/aula</span>
            <span v-if="aluno.telefone"><i class="bi bi-phone"></i> {{ aluno.telefone }}</span>
            <span :class="aluno.ativo ? 'text-success' : 'text-danger'" style="font-size:.7rem">
              <i :class="aluno.ativo ? 'bi bi-circle-fill' : 'bi bi-circle'" style="font-size:.5rem"></i>
              {{ aluno.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div v-if="aluno.responsavelId" class="meta mt-1">
            <span class="resp-badge"><i class="bi bi-person-badge-fill"></i> {{ catalog.getRespNome(aluno.responsavelId) }}</span>
          </div>
          <div v-if="aulasStore.getPendenciasAluno(aluno.id).length > 0" style="font-size:.72rem;color:#e65100;margin-top:3px">
            <i class="bi bi-exclamation-circle-fill"></i>
            {{ aulasStore.getPendenciasAluno(aluno.id).length }} pendência(s) · R$ {{ aulasStore.getPendenciasAluno(aluno.id).reduce((s, p) => s + p.valor, 0).toFixed(2) }}
          </div>
          <div v-if="aluno.observacoes" class="meta mt-1" style="font-style:italic">{{ aluno.observacoes }}</div>
        </div>
        <div class="actions">
          <button class="btn-icon" @click="ui.openModalAluno(aluno)"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" @click="delAluno(aluno.id)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

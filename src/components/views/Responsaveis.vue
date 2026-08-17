<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import type { Responsavel } from '../../types/domain';

const ui = useUiStore();
const catalog = useCatalogStore();

function delResp(id: string): void {
  ui.askConfirm(async () => { await catalog.delResp(id); ui.showToast('Responsável removido.'); });
}
function abrirWhatsResp(resp: Responsavel): void {
  ui.abrirWhatsResp(resp);
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Responsáveis</div>
      <button class="btn-gold" @click="ui.openModalResp(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div v-if="catalog.responsaveis.length === 0" class="empty-state">
      <i class="bi bi-person-vcard"></i>
      Nenhum responsável cadastrado.
    </div>
    <div class="card p-0" v-if="catalog.responsaveis.length > 0">
      <div v-for="(resp, idx) in catalog.responsaveis" :key="resp.id" class="list-item" :style="idx === 0 ? 'border-radius:12px 12px 0 0' : ''">
        <div class="avatar" style="background:#fff8e1;border-color:#ffe082;color:#7b4a00">
          <i class="bi bi-person-badge-fill" style="font-size:.95rem"></i>
        </div>
        <div class="info">
          <div class="nome">{{ resp.nome }}</div>
          <div class="meta mt-1 d-flex flex-wrap gap-2">
            <span v-if="resp.telefone"><i class="bi bi-phone"></i> {{ resp.telefone }}</span>
            <span v-if="resp.email"><i class="bi bi-envelope"></i> {{ resp.email }}</span>
            <span :class="resp.ativo ? 'text-success' : 'text-danger'" style="font-size:.7rem">
              <i :class="resp.ativo ? 'bi bi-circle-fill' : 'bi bi-circle'" style="font-size:.5rem"></i>
              {{ resp.ativo ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
          <div class="alunos-vinculados" v-if="catalog.getAlunosDoResponsavel(resp.id).length > 0">
            <span v-for="al in catalog.getAlunosDoResponsavel(resp.id)" :key="al.id" class="av-chip">
              <i class="bi bi-person-fill"></i> {{ al.nome }}
            </span>
          </div>
          <div v-if="resp.observacoes" class="meta mt-1" style="font-style:italic">{{ resp.observacoes }}</div>
        </div>
        <div class="actions">
          <button class="btn-icon" style="color:#25D366" @click="abrirWhatsResp(resp)" title="Enviar fechamento via WhatsApp"><i class="bi bi-whatsapp"></i></button>
          <button class="btn-icon" @click="ui.openModalResp(resp)"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" @click="delResp(resp.id)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';

const ui = useUiStore();
const catalog = useCatalogStore();

function delNucleo(id: string): void {
  ui.askConfirm(async () => { await catalog.delNucleo(id); ui.showToast('Núcleo removido.'); });
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Núcleos</div>
      <button class="btn-gold" @click="ui.openModalNucleo(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div v-if="catalog.nucleos.length === 0" class="empty-state"><i class="bi bi-building-x"></i> Nenhum núcleo cadastrado.</div>
    <div class="card p-0" v-if="catalog.nucleos.length > 0">
      <div v-for="(nucleo, idx) in catalog.nucleos" :key="nucleo.id" class="list-item" :style="idx === 0 ? 'border-radius:12px 12px 0 0' : ''">
        <div class="avatar" style="background:var(--chess-dark-brown);color:white;border-color:var(--chess-dark-brown)">
          <i class="bi bi-geo-alt-fill" style="font-size:1rem"></i>
        </div>
        <div class="info">
          <div class="nome">{{ nucleo.nome }}</div>
          <div class="meta mt-1" v-if="nucleo.endereco"><i class="bi bi-map"></i> {{ nucleo.endereco }}</div>
          <div class="meta mt-1" v-if="nucleo.observacoes" style="font-style:italic">{{ nucleo.observacoes }}</div>
        </div>
        <div class="actions">
          <button class="btn-icon" @click="ui.openModalNucleo(nucleo)"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon danger" @click="delNucleo(nucleo.id)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
const ui = useUiStore();
</script>

<template>
  <div class="confirm-overlay" v-if="ui.confirmDel" @click.self="ui.confirmDel = null">
    <div class="confirm-box">
      <h5>{{ ui.confirmDel.title ?? 'Confirmar exclusão' }}</h5>
      <p style="margin:10px 0 18px;color:#666;font-size:.9rem">{{ ui.confirmDel.message ?? 'Tem certeza? Esta ação não pode ser desfeita.' }}</p>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.confirmDel = null">Cancelar</button>
        <button class="btn flex-fill" :class="ui.confirmDel.danger === false ? 'btn-gold' : 'btn-danger'" @click="ui.resolveConfirm()">{{ ui.confirmDel.confirmLabel ?? 'Excluir' }}</button>
      </div>
    </div>
  </div>
</template>

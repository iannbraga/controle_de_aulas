<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
const ui = useUiStore();
</script>

<template>
  <div class="toast-container" v-if="ui.toast">
    <div class="toast-msg">{{ ui.toast }}</div>
  </div>
</template>

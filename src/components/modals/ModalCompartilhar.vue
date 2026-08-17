<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { getMonthRef, monthLabel, aulaInMonth } from '../../lib/helpers';
import { textoFechamentoMes } from '../../lib/reports';

const ui = useUiStore();
const aulasStore = useAulasStore();
const catalog = useCatalogStore();

const shareMesOffset = ref(0);
watch(() => ui.modals.compartilhar, (aberto) => { if (aberto) shareMesOffset.value = 0; });

const shareRef = computed(() => getMonthRef(shareMesOffset.value));
const shareMesLabel = computed(() => monthLabel(shareRef.value));
const shareAulasMes = computed(() => aulasStore.aulasSorted.filter(a => aulaInMonth(a, shareRef.value.year, shareRef.value.month)));

const pendsDoMes = computed(() => aulasStore.todasPendencias
  .map(p => ({ ...p, aulas: p.aulas.filter(item => { const [y, m] = item.data.split('-').map(Number); return y === shareRef.value.year && m - 1 === shareRef.value.month; }) }))
  .filter(p => p.aulas.length > 0)
  .map(p => ({ ...p, total: p.aulas.reduce((s, i) => s + i.valor, 0) })));

const textoCompartilhar = computed(() => textoFechamentoMes(shareMesLabel.value, shareAulasMes.value, pendsDoMes.value, catalog));
const podeCompartilharNativo = computed(() => !!navigator.share);

function copiarTexto(): void {
  navigator.clipboard.writeText(textoCompartilhar.value)
    .then(() => ui.showToast('Texto copiado!'))
    .catch(() => ui.showToast('Não foi possível copiar.'));
}
function compartilharNativo(): void {
  navigator.share({ title: `Clube de Xadrez — ${shareMesLabel.value}`, text: textoCompartilhar.value }).catch(() => {});
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.compartilhar" @click.self="ui.modals.compartilhar = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-share"></i> Fechamento para Compartilhar</div>
      <div class="mes-nav" style="margin-bottom:14px">
        <button class="mes-btn" @click="shareMesOffset--">‹</button>
        <div class="mes-label">{{ shareMesLabel }}</div>
        <button class="mes-btn" @click="shareMesOffset++" :disabled="shareMesOffset >= 0">›</button>
      </div>
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px;font-size:.8rem;line-height:1.7;color:var(--text-primary);white-space:pre-wrap;max-height:320px;overflow-y:auto;font-family:monospace">{{ textoCompartilhar }}</div>
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-outline-secondary flex-fill" @click="copiarTexto"><i class="bi bi-clipboard"></i> Copiar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="compartilharNativo" v-if="podeCompartilharNativo"><i class="bi bi-share"></i> Compartilhar</button>
      </div>
    </div>
  </div>
</template>

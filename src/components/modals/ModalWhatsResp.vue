<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { getMonthRef, monthLabel, aulaInMonth, formatDate } from '../../lib/helpers';

const ui = useUiStore();
const aulasStore = useAulasStore();
const catalog = useCatalogStore();

const respWhatsRef = computed(() => getMonthRef(ui.respWhatsMesOffset));
const respWhatsMesLabel = computed(() => monthLabel(respWhatsRef.value));

const respWhatsAulas = computed(() => {
  if (!ui.respWhatsTarget) return [];
  const { year, month } = respWhatsRef.value;
  const alunosDoResp = catalog.alunos.filter(a => a.responsavelId === ui.respWhatsTarget!.id).map(a => a.id);
  if (!alunosDoResp.length) return [];
  return aulasStore.aulasSorted
    .filter(a => aulaInMonth(a, year, month))
    .map(aula => ({ ...aula, alunosDoResp: aula.alunos.filter(aa => aa.presente && alunosDoResp.includes(aa.alunoId)) }))
    .filter(a => a.alunosDoResp.length > 0);
});

const respWhatsTotais = computed(() => {
  let totalAulas = 0, totalValor = 0, totalPendente = 0;
  for (const aula of respWhatsAulas.value) {
    totalAulas++;
    for (const aa of aula.alunosDoResp) {
      totalValor += aa.valorPago || 0;
      if (!aa.pago) totalPendente += aa.valorPago || 0;
    }
  }
  return { totalAulas, totalValor, totalPendente };
});

const textoWhatsResp = computed(() => {
  const resp = ui.respWhatsTarget;
  if (!resp) return '';
  const mesLabel = respWhatsMesLabel.value.charAt(0).toUpperCase() + respWhatsMesLabel.value.slice(1);
  const alunosDoResp = catalog.alunos.filter(a => a.responsavelId === resp.id);
  const sep = '─'.repeat(32);
  const linhas: string[] = [];

  linhas.push(`Mentes em Xeque — Cobrança ${mesLabel}`);
  linhas.push(`Responsável: ${resp.nome}`);
  linhas.push(sep);

  let totalGeral = 0;
  for (const al of alunosDoResp) {
    const aulasDoAluno = respWhatsAulas.value.filter(a => a.alunosDoResp.some(aa => aa.alunoId === al.id));
    if (!aulasDoAluno.length) continue;

    linhas.push(` ${al.nome}`);
    let subtotal = 0;
    for (const aula of aulasDoAluno) {
      const aa = aula.alunosDoResp.find(x => x.alunoId === al.id);
      const valor = aa ? (aa.valorPago || 0) : 0;
      subtotal += valor;
      linhas.push(`  ${formatDate(aula.data)} — ${catalog.getNucleoNome(aula.nucleoId)} — R$ ${valor.toFixed(2)}`);
    }
    linhas.push(`  Subtotal: R$ ${subtotal.toFixed(2)} (${aulasDoAluno.length} aula${aulasDoAluno.length > 1 ? 's' : ''})`);
    linhas.push(' ');
    totalGeral += subtotal;
  }

  linhas.push(sep);
  linhas.push(`Total: R$ ${totalGeral.toFixed(2)}`);
  if (aulasStore.chavePix.trim()) linhas.push(`Chave Pix: ${aulasStore.chavePix.trim()}`);

  return linhas.join('\n');
});

function enviarWhatsResp(): void {
  if (!ui.respWhatsTarget) return;
  const tel = ui.respWhatsTarget.telefone?.replace(/\D/g, '') || '';
  const texto = encodeURIComponent(textoWhatsResp.value);
  const url = tel ? `https://wa.me/55${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
  window.open(url, '_blank');
}
function copiarTextoWhatsResp(): void {
  navigator.clipboard.writeText(textoWhatsResp.value)
    .then(() => ui.showToast('Texto copiado!'))
    .catch(() => ui.showToast('Não foi possível copiar.'));
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.respWhats && ui.respWhatsTarget" @click.self="ui.modals.respWhats = false">
    <div class="modal-sheet" v-if="ui.respWhatsTarget">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-whatsapp" style="color:#25D366"></i> Fechamento via WhatsApp</div>

      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 12px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)">
        <div class="avatar" style="width:38px;height:38px;font-size:.95rem;flex-shrink:0;background:#fff8e1;border-color:#ffe082;color:#7b4a00">
          <i class="bi bi-person-badge-fill" style="font-size:.95rem"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.95rem">{{ ui.respWhatsTarget.nome }}</div>
          <div style="font-size:.78rem;color:var(--text-muted)" v-if="ui.respWhatsTarget.telefone">
            <i class="bi bi-phone"></i> {{ ui.respWhatsTarget.telefone }}
          </div>
          <div style="font-size:.75rem;color:var(--chess-red)" v-else>
            <i class="bi bi-exclamation-circle"></i> Sem telefone cadastrado
          </div>
        </div>
      </div>

      <div class="mes-nav" style="margin-bottom:14px">
        <button class="mes-btn" @click="ui.respWhatsMesOffset--">‹</button>
        <div class="mes-label">{{ respWhatsMesLabel }}</div>
        <button class="mes-btn" @click="ui.respWhatsMesOffset++" :disabled="ui.respWhatsMesOffset >= 0">›</button>
      </div>

      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px;font-size:.8rem;line-height:1.75;color:var(--text-primary);white-space:pre-wrap;max-height:280px;overflow-y:auto;font-family:monospace">{{ textoWhatsResp }}</div>

      <div v-if="respWhatsAulas.length > 0" style="display:flex;gap:8px;margin-top:10px">
        <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-dark-brown)">{{ respWhatsTotais.totalAulas }}</div>
          <div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase">Aulas</div>
        </div>
        <div style="flex:1;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-green)">R$ {{ respWhatsTotais.totalValor.toFixed(2) }}</div>
          <div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase">Total</div>
        </div>
        <div v-if="respWhatsTotais.totalPendente > 0" style="flex:1;background:#fff3e0;border:1px solid #ffe082;border-radius:8px;padding:8px;text-align:center">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-red)">R$ {{ respWhatsTotais.totalPendente.toFixed(2) }}</div>
          <div style="font-size:.65rem;color:var(--chess-red);text-transform:uppercase">Pendente</div>
        </div>
      </div>

      <div style="margin-top:10px">
        <label style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:4px"><i class="bi bi-qr-code"></i> Chave Pix</label>
        <input class="form-control form-control-sm" v-model="aulasStore.chavePix" placeholder="Ex: xadrez@gmail.com" style="font-size:.82rem" />
      </div>

      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-outline-secondary flex-fill" @click="copiarTextoWhatsResp"><i class="bi bi-clipboard"></i> Copiar</button>
        <button class="btn flex-fill justify-content-center" style="background:#25D366;color:#fff;border:none;border-radius:10px;font-weight:600;display:flex;align-items:center;gap:6px" @click="enviarWhatsResp">
          <i class="bi bi-whatsapp"></i> {{ ui.respWhatsTarget.telefone ? 'Abrir WhatsApp' : 'Enviar (sem número)' }}
        </button>
      </div>
      <button class="btn btn-outline-secondary w-100 mt-2" @click="ui.modals.respWhats = false">Fechar</button>
    </div>
  </div>
</template>

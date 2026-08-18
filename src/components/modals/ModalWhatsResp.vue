<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useAulasStore } from '../../stores/aulas';
import { useCatalogStore } from '../../stores/catalog';
import { getMonthRef, monthLabel, aulaInMonth, formatDate, nomeResponsavel, telefoneResponsavel } from '../../lib/helpers';

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
    .filter(a => aulaInMonth(a, year, month) && !aulasStore.nucleoEhMensalidade(a.nucleoId)) // mensalidade é cobrada à parte, ver tela Mensalidades
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
  linhas.push(`Responsável: ${nomeResponsavel(resp)}`);
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
  const tel = telefoneResponsavel(ui.respWhatsTarget).replace(/\D/g, '') || '';
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
  <div class="modal-backdrop-custom modal" v-if="ui.modals.respWhats && ui.respWhatsTarget" @click.self="ui.modals.respWhats = false">
    <div class="modal-sheet modal-content" v-if="ui.respWhatsTarget">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-whatsapp" style="color:#25D366"></i> Fechamento via WhatsApp</div>
      </div>
      <div class="modal-body">
      <div class="d-flex align-items-center gap-2 mb-3" style="padding:10px 12px;background:var(--surface-2);border-radius:10px;border:1px solid var(--border)">
        <div class="avatar flex-shrink-0" style="width:38px;height:38px;font-size:.95rem;background:#fff8e1;border-color:#ffe082;color:#7b4a00">
          <i class="bi bi-person-badge-fill" style="font-size:.95rem"></i>
        </div>
        <div class="flex-fill" style="min-width:0">
          <div style="font-weight:600;font-size:.95rem">{{ nomeResponsavel(ui.respWhatsTarget) }}</div>
          <div style="font-size:.78rem;color:var(--text-muted)" v-if="telefoneResponsavel(ui.respWhatsTarget)">
            <i class="bi bi-phone"></i> {{ telefoneResponsavel(ui.respWhatsTarget) }}
          </div>
          <div style="font-size:.75rem;color:var(--chess-red)" v-else>
            <i class="bi bi-exclamation-circle"></i> Sem telefone cadastrado
          </div>
        </div>
      </div>

      <div class="mes-nav mb-3">
        <button class="mes-btn" @click="ui.respWhatsMesOffset--">‹</button>
        <div class="mes-label">{{ respWhatsMesLabel }}</div>
        <button class="mes-btn" @click="ui.respWhatsMesOffset++" :disabled="ui.respWhatsMesOffset >= 0">›</button>
      </div>

      <div class="p-3" style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;font-size:.8rem;line-height:1.75;color:var(--text-primary);white-space:pre-wrap;max-height:280px;overflow-y:auto;font-family:monospace">{{ textoWhatsResp }}</div>

      <div v-if="respWhatsAulas.length > 0" class="d-flex flex-wrap gap-2 mt-2">
        <div class="text-center p-2" style="flex:1 1 84px;min-width:84px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-dark-brown)">{{ respWhatsTotais.totalAulas }}</div>
          <div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase">Aulas</div>
        </div>
        <div class="text-center p-2" style="flex:1 1 84px;min-width:84px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-green)">R$ {{ respWhatsTotais.totalValor.toFixed(2) }}</div>
          <div style="font-size:.65rem;color:var(--text-muted);text-transform:uppercase">Total</div>
        </div>
        <div v-if="respWhatsTotais.totalPendente > 0" class="text-center p-2" style="flex:1 1 84px;min-width:84px;background:#fff3e0;border:1px solid #ffe082;border-radius:8px">
          <div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--chess-red)">R$ {{ respWhatsTotais.totalPendente.toFixed(2) }}</div>
          <div style="font-size:.65rem;color:var(--chess-red);text-transform:uppercase">Pendente</div>
        </div>
      </div>

      <div class="mt-2">
        <label class="d-block mb-1" style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em"><i class="bi bi-qr-code"></i> Chave Pix</label>
        <input class="form-control form-control-sm" v-model="aulasStore.chavePix" placeholder="Ex: xadrez@gmail.com" style="font-size:.82rem" />
      </div>

      </div>
      <div class="modal-footer">
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary flex-fill" @click="copiarTextoWhatsResp"><i class="bi bi-clipboard"></i> Copiar</button>
          <button class="btn flex-fill justify-content-center d-flex align-items-center gap-2" style="background:#25D366;color:#fff;border:none;border-radius:10px;font-weight:600" @click="enviarWhatsResp">
            <i class="bi bi-whatsapp"></i> {{ telefoneResponsavel(ui.respWhatsTarget) ? 'Abrir WhatsApp' : 'Enviar (sem número)' }}
          </button>
        </div>
        <button class="btn btn-outline-secondary w-100" @click="ui.modals.respWhats = false">Fechar</button>
      </div>
    </div>
  </div>
</template>

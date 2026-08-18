<script setup lang="ts">
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';

const ui = useUiStore();
const catalog = useCatalogStore();

async function salvar(): Promise<void> {
  if (!ui.formResp.nomePai.trim() && !ui.formResp.nomeMae.trim()) {
    ui.showToast('Informe o nome do pai e/ou da mãe.');
    return;
  }
  try {
    await catalog.salvarResp({ ...ui.formResp });
    ui.modals.resp = false;
    ui.showToast('Responsável salvo!');
  } catch {
    ui.showToast('Erro ao salvar responsável.');
  }
}
</script>

<template>
  <div class="modal-backdrop-custom modal" v-if="ui.modals.resp" @click.self="ui.modals.resp = false">
    <div class="modal-sheet modal-content">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title"><i class="bi bi-person-badge-fill"></i> {{ ui.formResp.id ? 'Editar' : 'Novo' }} Responsável</div>
      </div>
      <div class="modal-body">
      <div class="mb-2" style="font-size:0.73rem;color:var(--text-muted)">
        <i class="bi bi-info-circle"></i> Preencha os dados de pelo menos um dos dois. Dá pra cadastrar pai e mãe juntos, como um único responsável.
      </div>

      <div class="mb-2" style="font-family:'DM Serif Display',serif;font-size:.95rem;color:var(--chess-dark-brown)">Pai</div>
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formResp.nomePai" placeholder="Nome completo do pai" />
      </div>
      <div class="mb-3">
        <label class="form-label">Telefone</label>
        <input class="form-control" v-model="ui.formResp.telefonePai" placeholder="(00) 00000-0000" type="tel" />
      </div>
      <div class="mb-3">
        <label class="form-label">E-mail (opcional)</label>
        <input class="form-control" v-model="ui.formResp.emailPai" placeholder="email@exemplo.com" type="email" />
      </div>

      <hr class="my-3" />

      <div class="mb-2" style="font-family:'DM Serif Display',serif;font-size:.95rem;color:var(--chess-dark-brown)">Mãe</div>
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formResp.nomeMae" placeholder="Nome completo da mãe" />
      </div>
      <div class="mb-3">
        <label class="form-label">Telefone</label>
        <input class="form-control" v-model="ui.formResp.telefoneMae" placeholder="(00) 00000-0000" type="tel" />
      </div>
      <div class="mb-3">
        <label class="form-label">E-mail (opcional)</label>
        <input class="form-control" v-model="ui.formResp.emailMae" placeholder="email@exemplo.com" type="email" />
      </div>

      <div class="mb-3">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="ui.formResp.observacoes" rows="2" placeholder="Ex: retirar só com a mãe..."></textarea>
      </div>
      <div class="mb-4">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" v-model="ui.formResp.ativo" id="respAtivo" />
          <label class="form-check-label" for="respAtivo">Ativo</label>
        </div>
      </div>
      </div>
      <div class="modal-footer">
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.resp = false">Cancelar</button>
          <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
        </div>
      </div>
    </div>
  </div>
</template>

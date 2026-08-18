<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import type { Responsavel } from '../../types/domain';
import { nomeResponsavel } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();

const mostrarTodos = ref(false);
const responsaveisExibidos = computed(() => mostrarTodos.value ? catalog.responsaveis : catalog.responsaveisAtivos);

function delResp(id: string): void {
  ui.askConfirm(async () => { await catalog.delResp(id); ui.showToast('Responsável removido.'); });
}
function abrirWhatsResp(resp: Responsavel): void {
  ui.abrirWhatsResp(resp);
}

async function reativarResp(resp: Responsavel): Promise<void> {
  try {
    await catalog.salvarResp({ ...resp, ativo: true });
    ui.showToast('Responsável reativado.');
  } catch {
    ui.showToast('Erro ao atualizar responsável.');
  }
}

function desativarResp(resp: Responsavel): void {
  const vinculados = catalog.getAlunosDoResponsavel(resp.id).filter(a => a.ativo);
  if (vinculados.length === 0) {
    ui.askConfirm(async () => {
      await catalog.salvarResp({ ...resp, ativo: false });
      ui.showToast('Responsável desativado.');
    }, {
      title: 'Desativar responsável',
      message: `Desativar ${nomeResponsavel(resp)}?`,
      confirmLabel: 'Desativar',
      danger: false,
    });
    return;
  }
  ui.askConfirm(async () => {
    await catalog.desativarRespComAlunos(resp.id);
    ui.showToast('Responsável e alunos desativados.');
  }, {
    title: 'Desativar responsável e alunos',
    message: `Desativar ${nomeResponsavel(resp)} também vai desativar ${vinculados.length} aluno(s) vinculado(s): ${vinculados.map(a => a.nome).join(', ')}. Dá pra reativar cada um depois, individualmente.`,
    confirmLabel: 'Desativar todos',
    danger: false,
  });
}

function toggleAtivoResp(resp: Responsavel): void {
  if (resp.ativo) desativarResp(resp);
  else reativarResp(resp);
}
</script>

<template>
  <div class="main-view">
    <div class="section-header">
      <div class="section-title">Responsáveis</div>
      <button class="btn-gold" @click="ui.openModalResp(null)"><i class="bi bi-plus-lg"></i> Novo</button>
    </div>
    <div class="d-flex justify-content-end mb-2">
      <button class="btn btn-sm btn-outline-secondary" @click="mostrarTodos = !mostrarTodos">
        <i class="bi" :class="mostrarTodos ? 'bi-funnel-fill' : 'bi-funnel'"></i>
        {{ mostrarTodos ? 'Mostrar só ativos' : 'Mostrar todos' }}
      </button>
    </div>
    <div v-if="catalog.responsaveis.length === 0" class="empty-state">
      <i class="bi bi-person-vcard"></i>
      Nenhum responsável cadastrado.
    </div>
    <div v-else-if="responsaveisExibidos.length === 0" class="empty-state">
      <i class="bi bi-person-vcard"></i>
      Nenhum responsável ativo.
    </div>
    <div class="card list-group p-0" v-if="responsaveisExibidos.length > 0">
      <div v-for="resp in responsaveisExibidos" :key="resp.id" class="list-group-item list-item resp-item">
        <div class="info">
          <div class="nome resp-nome">{{ nomeResponsavel(resp) }}</div>
          <div class="meta mt-1 d-flex flex-wrap gap-2">
            <span class="badge rounded-pill" :class="resp.ativo ? 'text-bg-success' : 'text-bg-danger'" style="font-size:.65rem">{{ resp.ativo ? 'Ativo' : 'Inativo' }}</span>
          </div>
          <div v-if="resp.nomePai" class="meta mt-1 d-flex flex-wrap gap-2">
            <span><i class="bi bi-person-fill"></i> Pai: {{ resp.nomePai }}</span>
            <span v-if="resp.telefonePai"><i class="bi bi-phone"></i> {{ resp.telefonePai }}</span>
            <span v-if="resp.emailPai"><i class="bi bi-envelope"></i> {{ resp.emailPai }}</span>
          </div>
          <div v-if="resp.nomeMae" class="meta mt-1 d-flex flex-wrap gap-2">
            <span><i class="bi bi-person-fill"></i> Mãe: {{ resp.nomeMae }}</span>
            <span v-if="resp.telefoneMae"><i class="bi bi-phone"></i> {{ resp.telefoneMae }}</span>
            <span v-if="resp.emailMae"><i class="bi bi-envelope"></i> {{ resp.emailMae }}</span>
          </div>
          <div class="alunos-vinculados" v-if="catalog.getAlunosDoResponsavel(resp.id).length > 0">
            <span v-for="al in catalog.getAlunosDoResponsavel(resp.id)" :key="al.id" class="badge av-chip">
              <i class="bi bi-person-fill"></i> {{ al.nome }}
            </span>
          </div>
          <div v-if="resp.observacoes" class="meta mt-1" style="font-style:italic">{{ resp.observacoes }}</div>
        </div>
        <div class="dropdown">
          <button class="btn-icon" data-bs-toggle="dropdown" aria-expanded="false" title="Ações">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><button class="dropdown-item" style="color:#25D366" @click="abrirWhatsResp(resp)"><i class="bi bi-whatsapp"></i> Cobrar via WhatsApp</button></li>
            <li><button class="dropdown-item" @click="toggleAtivoResp(resp)">
              <i :class="resp.ativo ? 'bi bi-toggle2-on text-success' : 'bi bi-toggle2-off text-danger'"></i> {{ resp.ativo ? 'Desativar' : 'Reativar' }}
            </button></li>
            <li><button class="dropdown-item" @click="ui.openModalResp(resp)"><i class="bi bi-pencil"></i> Editar</button></li>
            <li><button class="dropdown-item text-danger" @click="delResp(resp.id)"><i class="bi bi-trash"></i> Excluir</button></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sem avatar nesta lista (não usamos foto de pai/mãe) — o espaço liberado
   vai para um nome maior e mais legível. */
.resp-item {
  align-items: flex-start;
}

.resp-nome {
  font-size: 1.02rem;
}

.resp-item .dropdown {
  flex-shrink: 0;
}
</style>

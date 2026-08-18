<script setup lang="ts">
import { ref } from 'vue';
import { useUiStore } from '../../stores/ui';
import { useCatalogStore } from '../../stores/catalog';
import { HORARIOS_PADRAO } from '../../lib/helpers';

const ui = useUiStore();
const catalog = useCatalogStore();
const novoHorario = ref('');

function usarGradePadrao(): void {
  const existentes = new Set(ui.formNucleo.horarios);
  for (const h of HORARIOS_PADRAO) if (!existentes.has(h)) ui.formNucleo.horarios.push(h);
}
function adicionarHorario(): void {
  const h = novoHorario.value.trim();
  if (!h) return;
  if (!ui.formNucleo.horarios.includes(h)) ui.formNucleo.horarios.push(h);
  novoHorario.value = '';
}
function removerHorario(h: string): void {
  const i = ui.formNucleo.horarios.indexOf(h);
  if (i >= 0) ui.formNucleo.horarios.splice(i, 1);
}

async function salvar(): Promise<void> {
  if (!ui.formNucleo.nome.trim()) { ui.showToast('Informe o nome do núcleo.'); return; }
  try {
    await catalog.salvarNucleo({ ...ui.formNucleo });
    ui.modals.nucleo = false;
    ui.showToast('Núcleo salvo!');
  } catch {
    ui.showToast('Erro ao salvar núcleo.');
  }
}
</script>

<template>
  <div class="modal-backdrop-custom" v-if="ui.modals.nucleo" @click.self="ui.modals.nucleo = false">
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title"><i class="bi bi-geo-alt-fill"></i> {{ ui.formNucleo.id ? 'Editar' : 'Novo' }} Núcleo</div>
      <div class="mb-3">
        <label class="form-label">Nome</label>
        <input class="form-control" v-model="ui.formNucleo.nome" placeholder="Ex: Cesar Maingha" />
      </div>
      <div class="mb-3">
        <label class="form-label">Endereço (opcional)</label>
        <input class="form-control" v-model="ui.formNucleo.endereco" placeholder="Rua, bairro..." />
      </div>
      <div class="mb-3">
        <label class="form-label">Forma de cobrança</label>
        <select class="form-select" v-model="ui.formNucleo.formaCobranca">
          <option value="porAula">Por aula (cobra no fim do mês pelas aulas frequentadas)</option>
          <option value="mensalidade">Mensalidade (aluno paga um valor fixo adiantado por mês)</option>
        </select>
        <div style="font-size:0.73rem;color:var(--text-muted);margin-top:4px">
          <i class="bi bi-info-circle"></i> Com mensalidade, a cobrança aparece na tela "Mensalidades" e é gerada antes das aulas do mês (ex: Maple Bear).
        </div>
      </div>
      <div class="mb-3" v-if="ui.formNucleo.formaCobranca === 'mensalidade'">
        <label class="form-label">Grade de horários</label>
        <div style="font-size:0.73rem;color:var(--text-muted);margin-bottom:6px">
          <i class="bi bi-info-circle"></i> Horários oferecidos por este núcleo — usados para montar as Turmas (dia + horário) em que os alunos se matriculam.
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px" v-if="ui.formNucleo.horarios.length > 0">
          <span v-for="h in ui.formNucleo.horarios" :key="h" class="badge-nivel" style="display:flex;align-items:center;gap:6px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-primary)">
            {{ h }}
            <i class="bi bi-x-circle-fill" style="cursor:pointer;color:var(--chess-red)" @click="removerHorario(h)"></i>
          </span>
        </div>
        <div style="display:flex;gap:6px">
          <input class="form-control" v-model="novoHorario" placeholder="Ex: 08:00-09:00" @keyup.enter="adicionarHorario" />
          <button type="button" class="btn btn-outline-secondary" @click="adicionarHorario"><i class="bi bi-plus-lg"></i></button>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary mt-2" @click="usarGradePadrao">
          <i class="bi bi-magic"></i> Usar grade padrão (matutino 8h-12h e vespertino 14h-18h)
        </button>
      </div>
      <div class="mb-3">
        <label class="form-label">Observações</label>
        <textarea class="form-control" v-model="ui.formNucleo.observacoes" rows="2"></textarea>
      </div>
      <div class="mb-4">
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" v-model="ui.formNucleo.ativo" id="nucleoAtivo" />
          <label class="form-check-label" for="nucleoAtivo">Ativo</label>
        </div>
        <div style="font-size:0.73rem;color:var(--text-muted);margin-top:4px">
          <i class="bi bi-info-circle"></i> Núcleos inativos somem das opções ao registrar novas aulas ou matricular alunos, mas o histórico continua intacto.
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill" @click="ui.modals.nucleo = false">Cancelar</button>
        <button class="btn-gold flex-fill justify-content-center" @click="salvar"><i class="bi bi-check-lg"></i> Salvar</button>
      </div>
    </div>
  </div>
</template>

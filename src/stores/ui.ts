import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Professor, Aluno, Nucleo, Responsavel } from '../types/domain';

export type View = 'home' | 'aulas' | 'pendencias' | 'responsaveis' | 'professores' | 'alunos' | 'nucleos' | 'financeiro';

interface ConfirmDel {
  fn: () => void | Promise<void>;
}

const blankProf = (): Professor => ({ id: '', nome: '', nivel: 'professor', peso: 1.5, ativo: true });
const blankAluno = (): Aluno => ({ id: '', nome: '', telefone: '', responsavelId: '', valorPadrao: 15, observacoes: '', ativo: true });
const blankNucleo = (): Nucleo => ({ id: '', nome: '', endereco: '', observacoes: '' });
const blankResp = (): Responsavel => ({ id: '', nome: '', telefone: '', email: '', observacoes: '', ativo: true });

/** Estado de navegação/UI: view ativa, toasts, modais e formulários de cadastro. */
export const useUiStore = defineStore('ui', () => {
  const view = ref<View>('home');
  const toast = ref<string | null>(null);
  const confirmDel = ref<ConfirmDel | null>(null);

  const modals = reactive({
    prof: false, aluno: false, nucleo: false, aula: false,
    financeiro: false, dados: false, compartilhar: false,
    resp: false, respWhats: false,
  });

  const formProf = reactive<Professor>(blankProf());
  const formAluno = reactive<Aluno>(blankAluno());
  const formNucleo = reactive<Nucleo>(blankNucleo());
  const formResp = reactive<Responsavel>(blankResp());

  // Cobrança individual via WhatsApp: responsável/mês selecionados para o modal.
  const respWhatsTarget = ref<Responsavel | null>(null);
  const respWhatsMesOffset = ref(0);
  function abrirWhatsResp(resp: Responsavel): void {
    respWhatsTarget.value = resp;
    respWhatsMesOffset.value = 0;
    modals.respWhats = true;
  }

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function showToast(msg: string): void {
    toast.value = msg;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.value = null; }, 2400);
  }

  function askConfirm(fn: () => void | Promise<void>): void {
    confirmDel.value = { fn };
  }
  async function resolveConfirm(): Promise<void> {
    const pending = confirmDel.value;
    confirmDel.value = null;
    if (!pending) return;
    try {
      await pending.fn();
    } catch {
      showToast('Ocorreu um erro. Tente novamente.');
    }
  }

  function openModalProf(prof: Professor | null): void {
    Object.assign(formProf, prof ? { ...prof } : blankProf());
    modals.prof = true;
  }
  function openModalAluno(aluno: Aluno | null): void {
    Object.assign(formAluno, aluno ? { ...aluno } : blankAluno());
    modals.aluno = true;
  }
  function openModalNucleo(nucleo: Nucleo | null): void {
    Object.assign(formNucleo, nucleo ? { ...nucleo } : blankNucleo());
    modals.nucleo = true;
  }
  function openModalResp(resp: Responsavel | null): void {
    Object.assign(formResp, resp ? { ...resp } : blankResp());
    modals.resp = true;
  }

  return {
    view, toast, confirmDel, modals,
    formProf, formAluno, formNucleo, formResp,
    respWhatsTarget, respWhatsMesOffset, abrirWhatsResp,
    showToast, askConfirm, resolveConfirm,
    openModalProf, openModalAluno, openModalNucleo, openModalResp,
  };
});

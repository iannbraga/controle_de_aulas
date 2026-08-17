<script setup lang="ts">
import { useUiStore } from './stores/ui';
import { useAulasStore } from './stores/aulas';

import Topbar from './components/common/Topbar.vue';
import Toast from './components/common/Toast.vue';
import ConfirmDialog from './components/common/ConfirmDialog.vue';
import BottomNav from './components/common/BottomNav.vue';

import Home from './components/views/Home.vue';
import Aulas from './components/views/Aulas.vue';
import Pendencias from './components/views/Pendencias.vue';
import Responsaveis from './components/views/Responsaveis.vue';
import Professores from './components/views/Professores.vue';
import Alunos from './components/views/Alunos.vue';
import Nucleos from './components/views/Nucleos.vue';
import Financeiro from './components/views/Financeiro.vue';

import ModalResponsavel from './components/modals/ModalResponsavel.vue';
import ModalProfessor from './components/modals/ModalProfessor.vue';
import ModalAluno from './components/modals/ModalAluno.vue';
import ModalNucleo from './components/modals/ModalNucleo.vue';
import ModalAula from './components/modals/ModalAula.vue';
import ModalFinanceiroAula from './components/modals/ModalFinanceiroAula.vue';
import ModalDados from './components/modals/ModalDados.vue';
import ModalCompartilhar from './components/modals/ModalCompartilhar.vue';
import ModalWhatsResp from './components/modals/ModalWhatsResp.vue';

const ui = useUiStore();
const aulasStore = useAulasStore();
</script>

<template>
  <div id="app-shell">
    <Topbar />
    <Toast />
    <ConfirmDialog />

    <Home v-if="ui.view === 'home'" />
    <Aulas v-else-if="ui.view === 'aulas'" />
    <Pendencias v-else-if="ui.view === 'pendencias'" />
    <Responsaveis v-else-if="ui.view === 'responsaveis'" />
    <Professores v-else-if="ui.view === 'professores'" />
    <Alunos v-else-if="ui.view === 'alunos'" />
    <Nucleos v-else-if="ui.view === 'nucleos'" />
    <Financeiro v-else-if="ui.view === 'financeiro'" />

    <ModalResponsavel />
    <ModalProfessor />
    <ModalAluno />
    <ModalNucleo />
    <ModalAula />
    <ModalFinanceiroAula v-if="aulasStore.form" />
    <ModalDados />
    <ModalCompartilhar />
    <ModalWhatsResp />

    <BottomNav />
  </div>
</template>

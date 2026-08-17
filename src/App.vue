<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useAuthStore } from './stores/auth';
import { useSyncStore } from './stores/sync';
import { useUiStore } from './stores/ui';
import { useAulasStore } from './stores/aulas';
import { useSettingsStore } from './stores/settings';

import Login from './components/Login.vue';

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

const auth = useAuthStore();
const sync = useSyncStore();
const ui = useUiStore();
const aulasStore = useAulasStore();
const settings = useSettingsStore();

onMounted(() => { auth.init(); settings.fetch(); });

watch(() => auth.user, (user, prevUser) => {
  if (user && user.id !== prevUser?.id) {
    sync.bootstrap();
  } else if (!user) {
    sync.reset();
  }
}, { immediate: false });
</script>

<template>
  <div id="app-shell">
    <template v-if="!auth.ready">
      <div class="sync-screen">
        <div class="spinner-border" role="status"></div>
      </div>
    </template>

    <template v-else-if="!auth.user">
      <Login />
    </template>

    <template v-else-if="sync.status !== 'ready'">
      <div class="sync-screen">
        <div class="spinner-border" role="status"></div>
        <div v-if="sync.status === 'migrating'">Migrando seus dados antigos para a nuvem...</div>
        <div v-else-if="sync.status === 'checking'">Verificando seus dados...</div>
        <div v-else-if="sync.status === 'loading'">Carregando...</div>
        <div v-else-if="sync.status === 'error'" style="color:var(--chess-red);text-align:center;padding:0 24px">
          <i class="bi bi-exclamation-circle-fill"></i> {{ sync.errorMsg }}
          <div style="margin-top:10px"><button class="btn btn-outline-secondary btn-sm" @click="sync.bootstrap()">Tentar de novo</button></div>
        </div>
      </div>
    </template>

    <template v-else>
      <Topbar />
      <Toast />
      <ConfirmDialog />

      <div v-if="sync.migrationSummary" class="toast-container" style="top:56px">
        <div class="toast-msg" style="background:var(--chess-green)">{{ sync.migrationSummary }}</div>
      </div>

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
    </template>
  </div>
</template>

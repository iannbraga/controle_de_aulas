<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';

const auth = useAuthStore();
const settings = useSettingsStore();
const modo = ref<'entrar' | 'criar'>('entrar');
const email = ref('');
const password = ref('');
const infoMsg = ref<string | null>(null);

onMounted(() => {
  if (!settings.loaded) settings.fetch();
});

async function submit(): Promise<void> {
  infoMsg.value = null;
  if (!email.value.trim() || !password.value) return;

  if (modo.value === 'entrar') {
    await auth.signIn(email.value.trim(), password.value);
  } else {
    if (!settings.permitirCadastro) { auth.errorMsg = 'Criação de conta está desativada no momento.'; return; }
    const res = await auth.signUp(email.value.trim(), password.value);
    if (res.ok && res.needsConfirmation) {
      infoMsg.value = 'Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.';
    } else if (res.ok) {
      infoMsg.value = null;
    }
  }
}

function alternarModo(): void {
  if (modo.value === 'entrar' && !settings.permitirCadastro) return;
  modo.value = modo.value === 'entrar' ? 'criar' : 'entrar';
  auth.errorMsg = null;
  infoMsg.value = null;
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="topbar-icon text-center mb-1" style="font-size:2.2rem">♟</div>
      <div class="topbar-title text-center" style="color:var(--text-primary);font-size:1.3rem;margin-bottom:2px">Clube de Xadrez</div>
      <div class="text-center" style="color:var(--text-muted);font-size:.8rem;margin-bottom:22px">Gestão de Aulas</div>

      <form @submit.prevent="submit">
        <div class="mb-3">
          <label class="form-label">E-mail</label>
          <input class="form-control" type="email" v-model="email" placeholder="voce@exemplo.com" autocomplete="username" required />
        </div>
        <div class="mb-3">
          <label class="form-label">Senha</label>
          <input class="form-control" type="password" v-model="password" placeholder="••••••••" autocomplete="current-password" minlength="6" required />
        </div>

        <div v-if="auth.errorMsg" class="mb-3" style="color:var(--chess-red);font-size:.8rem">
          <i class="bi bi-exclamation-circle-fill"></i> {{ auth.errorMsg }}
        </div>
        <div v-if="infoMsg" class="mb-3" style="color:var(--chess-green);font-size:.8rem">
          <i class="bi bi-check-circle-fill"></i> {{ infoMsg }}
        </div>

        <button type="submit" class="btn-gold w-100 justify-content-center" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner-border spinner-border-sm"></span>
          <span v-else>{{ modo === 'entrar' ? 'Entrar' : 'Criar conta' }}</span>
        </button>
      </form>

      <div v-if="modo === 'criar' || settings.permitirCadastro" class="text-center mt-3" style="font-size:.82rem;color:var(--text-muted)">
        <template v-if="modo === 'entrar'">
          Ainda não tem conta?
          <a href="#" @click.prevent="alternarModo">Criar conta</a>
        </template>
        <template v-else>
          Já tem conta?
          <a href="#" @click.prevent="alternarModo">Entrar</a>
        </template>
      </div>
    </div>
  </div>
</template>

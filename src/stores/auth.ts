import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);
  const ready = ref(false); // true depois que a sessão inicial foi checada
  const loading = ref(false);
  const errorMsg = ref<string | null>(null);

  async function init(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    session.value = data.session;
    user.value = data.session?.user ?? null;
    ready.value = true;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;
    });
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    loading.value = true;
    errorMsg.value = null;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    loading.value = false;
    if (error) { errorMsg.value = traduzErro(error.message); return false; }
    session.value = data.session;
    user.value = data.user;
    return true;
  }

  async function signUp(email: string, password: string): Promise<{ ok: boolean; needsConfirmation: boolean }> {
    loading.value = true;
    errorMsg.value = null;
    const { data, error } = await supabase.auth.signUp({ email, password });
    loading.value = false;
    if (error) { errorMsg.value = traduzErro(error.message); return { ok: false, needsConfirmation: false }; }
    // Se o projeto exigir confirmação de e-mail, `session` vem nulo mesmo com sucesso.
    if (data.session) {
      session.value = data.session;
      user.value = data.user;
      return { ok: true, needsConfirmation: false };
    }
    return { ok: true, needsConfirmation: true };
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
    session.value = null;
    user.value = null;
  }

  function traduzErro(msg: string): string {
    if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
    if (/user already registered/i.test(msg)) return 'Já existe uma conta com este e-mail.';
    if (/password should be at least/i.test(msg)) return 'A senha deve ter pelo menos 6 caracteres.';
    if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
    return msg;
  }

  return { session, user, ready, loading, errorMsg, init, signIn, signUp, signOut };
});

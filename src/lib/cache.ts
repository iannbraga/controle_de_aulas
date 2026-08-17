// Cache local (localStorage) para os dados vindos do Supabase.
// Cada store tem sua própria chave. Enquanto o cache estiver dentro da
// validade (TTL configurável em Config → Dados), o app usa o que está aqui
// e não consulta o Supabase. Toda escrita bem-sucedida atualiza o cache na
// hora (ver stores/catalog.ts e stores/aulas.ts).

interface CacheEnvelope<T> {
  savedAt: number; // epoch ms
  data: T;
}

export function readCache<T>(key: string, ttlMs: number): T | null {
  if (ttlMs <= 0) return null; // TTL 0/negativo = cache desativado
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (!envelope || typeof envelope.savedAt !== 'number') return null;
    if (Date.now() - envelope.savedAt > ttlMs) return null; // expirado
    return envelope.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // localStorage indisponível/cheio — sem cache, sem problema, app segue via Supabase
  }
}

export function clearCache(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

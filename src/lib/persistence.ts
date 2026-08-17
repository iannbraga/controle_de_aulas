import type { Backup } from '../types/domain';

export const STORAGE_KEY = 'xadrez-v2';

/**
 * Carrega os dados do localStorage. Mantém compatibilidade com o formato
 * antigo (v1) do app em HTML/JS puro, aplicando a mesma migração que o
 * script.js original fazia (campo `pago` default true).
 */
export function loadData(): Partial<Backup> {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const v2 = JSON.parse(rawV2);
      if (v2) return v2;
    }
    const rawV1 = localStorage.getItem('xadrez-v1');
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      if (v1) {
        if (v1.aulas) {
          v1.aulas.forEach((aula: any) => {
            if (aula.alunos) aula.alunos.forEach((al: any) => { if (al.pago === undefined) al.pago = true; });
          });
        }
        return v1;
      }
    }
    return {};
  } catch {
    return {};
  }
}

export function persistData(dados: Backup): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

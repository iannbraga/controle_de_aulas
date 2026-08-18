import type { Aula, MonthRef, Responsavel, DiaSemana, Turma } from '../types/domain';

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getMonthRef(offset: number): MonthRef {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function aulaInMonth(aula: Aula, year: number, month: number): boolean {
  if (!aula.data) return false;
  const [y, m] = aula.data.split('-').map(Number);
  return y === year && m - 1 === month;
}

export function formatDate(d: string): string {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

export function monthLabel(ref: MonthRef): string {
  const d = new Date(ref.year, ref.month, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Mês encerrado = estritamente anterior ao mês atual
export function mesEncerrado(aulaData: string): boolean {
  if (!aulaData) return false;
  const now = new Date();
  const [y, m] = aulaData.split('-').map(Number);
  return y < now.getFullYear() || (y === now.getFullYear() && m - 1 < now.getMonth());
}

// ── Cálculo financeiro ──
export function calcTotal(aula: Aula): number {
  return aula.alunos.filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);
}

export function calcPesoTotal(aula: Aula): number {
  return aula.professores.reduce((s, p) => s + p.pesoAplicado, 0);
}

export function calcValorPorPeso(aula: Aula): number {
  const pt = calcPesoTotal(aula);
  return pt > 0 ? calcTotal(aula) / pt : 0;
}

export function alunosPresentes(aula: Aula): number {
  return aula.alunos.filter(a => a.presente).length;
}

// ── Responsável (Pai/Mãe) ──
// Um responsável pode ter pai e mãe cadastrados juntos; estas funções
// decidem o que exibir/usar em cada caso (nome combinado, telefone e
// e-mail "principais" pra ações como WhatsApp e cobrança).
export function nomeResponsavel(r: Responsavel): string {
  const nomes = [r.nomePai, r.nomeMae].map(n => (n || '').trim()).filter(Boolean);
  return nomes.length ? nomes.join(' e ') : 'Responsável sem nome';
}

export function telefoneResponsavel(r: Responsavel): string {
  return (r.telefonePai || '').trim() || (r.telefoneMae || '').trim() || '';
}

export function emailResponsavel(r: Responsavel): string {
  return (r.emailPai || '').trim() || (r.emailMae || '').trim() || '';
}

// ── Dia da semana (aula fixa de mensalidade) ──
export const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: 'domingo', label: 'Domingo' },
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
];

export function labelDiaSemana(dia: DiaSemana | ''): string {
  return DIAS_SEMANA.find(d => d.value === dia)?.label ?? '';
}

const DIAS_SEMANA_ABREV: Record<DiaSemana, string> = {
  domingo: 'Dom', segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui', sexta: 'Sex', sabado: 'Sáb',
};

// ── Turma (dia + horário fixo de núcleo de mensalidade) ──
// Grade padrão sugerida: matutino (8h-12h) e vespertino (14h-18h), 1h cada.
export const HORARIOS_PADRAO = [
  '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
];

export function labelTurma(turma: Turma): string {
  return `${DIAS_SEMANA_ABREV[turma.diaSemana] ?? turma.diaSemana} ${turma.horario}`;
}

export const NUCLEO_COLORS = ['#c9a84c', '#2e7d32', '#1565c0', '#7b1fa2', '#e65100', '#00838f', '#558b2f', '#d84315'];

export const PESO_SUGERIDO: Record<string, number> = { principal: 2, professor: 1.5, auxiliar: 1, trainee: 0.5 };

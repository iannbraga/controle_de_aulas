import type { Aula, GrupoPorNucleo, FinPorNucleo, FechamentoProfessor } from '../types/domain';
import { alunosPresentes, NUCLEO_COLORS, formatDate } from './helpers';
import type { useCatalogStore } from '../stores/catalog';

type Catalog = ReturnType<typeof useCatalogStore>;

// Cálculo do valor de uma aula é injetado pelo caller (normalmente
// aulasStore.valorAula/valorPorPesoAula) porque depende da forma de
// cobrança do núcleo: 'porAula' soma o valorPago dos presentes; 'mensalidade'
// rateia o total de mensalidades do mês pelo número de aulas do mês.
export interface CalcAula {
  total: (aula: Aula) => number;
  porPeso: (aula: Aula) => number;
}

export function agruparPorNucleo(lista: Aula[], catalog: Catalog, calc: CalcAula): GrupoPorNucleo[] {
  const map: Record<string, GrupoPorNucleo> = {};
  for (const aula of lista) {
    const id = aula.nucleoId || '__sem_nucleo__';
    if (!map[id]) map[id] = { nucleoId: id, nome: catalog.getNucleoNome(aula.nucleoId), aulas: [], total: 0 };
    map[id].aulas.push(aula);
    map[id].total += calc.total(aula);
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export function finPorNucleo(lista: Aula[], catalog: Catalog, calc: CalcAula): FinPorNucleo[] {
  const map: Record<string, FinPorNucleo> = {};
  for (const aula of lista) {
    const id = aula.nucleoId || '__sem_nucleo__';
    if (!map[id]) map[id] = { nucleoId: id, nome: catalog.getNucleoNome(aula.nucleoId), total: 0, numAulas: 0, numPresencas: 0 };
    map[id].total += calc.total(aula);
    map[id].numAulas += 1;
    map[id].numPresencas += alunosPresentes(aula);
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export function finFechamento(lista: Aula[], catalog: Catalog, calc: CalcAula): FechamentoProfessor[] {
  const map: Record<string, FechamentoProfessor & { nucleoMap: Record<string, { valor: number; numAulas: number }> }> = {};
  for (const aula of lista) {
    const vpp = calc.porPeso(aula);
    const nucId = aula.nucleoId || '__sem_nucleo__';
    for (const ap of aula.professores) {
      if (!map[ap.professorId]) {
        map[ap.professorId] = {
          profId: ap.professorId, nome: catalog.getProfNome(ap.professorId),
          total: 0, numAulas: 0, pesoTotal: 0, pesoMedio: 0, porNucleo: [], nucleoMap: {},
        };
      }
      const gain = ap.pesoAplicado * vpp;
      map[ap.professorId].total += gain;
      map[ap.professorId].numAulas += 1;
      map[ap.professorId].pesoTotal += ap.pesoAplicado;
      if (!map[ap.professorId].nucleoMap[nucId]) map[ap.professorId].nucleoMap[nucId] = { valor: 0, numAulas: 0 };
      map[ap.professorId].nucleoMap[nucId].valor += gain;
      map[ap.professorId].nucleoMap[nucId].numAulas += 1;
    }
  }
  const nucleoIds = [...new Set(lista.map(a => a.nucleoId || '__sem_nucleo__'))];
  const colorMap: Record<string, string> = {};
  nucleoIds.forEach((id, i) => { colorMap[id] = NUCLEO_COLORS[i % NUCLEO_COLORS.length]; });

  return Object.values(map)
    .map(p => ({
      profId: p.profId, nome: p.nome, total: p.total, numAulas: p.numAulas, pesoTotal: p.pesoTotal,
      pesoMedio: p.numAulas > 0 ? p.pesoTotal / p.numAulas : 0,
      porNucleo: Object.entries(p.nucleoMap)
        .map(([nucId, data]) => ({
          nucleoId: nucId,
          nome: catalog.getNucleoNome(nucId === '__sem_nucleo__' ? null : nucId),
          valor: data.valor, numAulas: data.numAulas, cor: colorMap[nucId] || '#888',
        }))
        .sort((a, b) => b.valor - a.valor),
    }))
    .sort((a, b) => b.total - a.total);
}

export function textoFechamentoMes(mesLabelRaw: string, lista: Aula[], pendencias: { aulas: { data: string }[]; total: number }[] | undefined, catalog: Catalog, calc: CalcAula): string {
  const mes = mesLabelRaw.charAt(0).toUpperCase() + mesLabelRaw.slice(1);
  const linhas: string[] = [];
  linhas.push(`♟ Clube de Xadrez — ${mes}`);
  linhas.push('─'.repeat(30));
  linhas.push(`📋 Aulas realizadas: ${lista.length}`);
  linhas.push(`👥 Total de presenças: ${lista.reduce((s, a) => s + alunosPresentes(a), 0)}`);
  const total = lista.reduce((s, a) => s + calc.total(a), 0);
  linhas.push(`💰 Total arrecadado: R$ ${total.toFixed(2)}`);
  if (pendencias && pendencias.length > 0) {
    const totalPend = pendencias.reduce((s, p) => s + p.total, 0);
    linhas.push(`⚠️ Pendências: ${pendencias.length} aluno(s) · R$ ${totalPend.toFixed(2)}`);
  }
  linhas.push('');
  const fechamento = finFechamento(lista, catalog, calc);
  if (fechamento.length > 0) {
    linhas.push('💵 Pagamento dos professores:');
    for (const fp of fechamento) linhas.push(`  • ${fp.nome}: R$ ${fp.total.toFixed(2)} (${fp.numAulas} aula${fp.numAulas > 1 ? 's' : ''})`);
    linhas.push('');
  }
  if (lista.length > 0) {
    linhas.push('📅 Aulas:');
    for (const aula of lista) {
      linhas.push(`  ${formatDate(aula.data)} — ${catalog.getNucleoNome(aula.nucleoId)}`);
      linhas.push(`    ${alunosPresentes(aula)} aluno(s) · R$ ${calc.total(aula).toFixed(2)} · ${aula.professores.map(ap => catalog.getProfNome(ap.professorId)).join(', ') || '—'}`);
    }
  }
  return linhas.join('\n');
}

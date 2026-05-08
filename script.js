const { createApp, reactive, computed, watch, ref } = Vue;

const STORAGE_KEY = 'xadrez-v1';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function getMonthRef(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function aulaInMonth(aula, year, month) {
  if (!aula.data) return false;
  const [y, m] = aula.data.split('-').map(Number);
  return y === year && (m - 1) === month;
}

const saved = loadData();

createApp({
  setup() {
    const view = ref('home');
    const toast = ref(null);
    const confirmDel = ref(null);
    const aulaFinanceiro = ref(null);

    const mesOffset = ref(0);
    const finMesOffset = ref(0);

    const professores = reactive(saved.professores || []);
    const alunos = reactive(saved.alunos || []);
    const nucleos = reactive(saved.nucleos || []);
    const aulas = reactive(saved.aulas || []);
    const responsaveis = reactive(saved.responsaveis || []);

    const persistAll = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ professores, alunos, nucleos, aulas, responsaveis }));
    };
    watch([professores, alunos, nucleos, aulas, responsaveis], persistAll, { deep: true });

    const showToast = (msg) => {
      toast.value = msg;
      setTimeout(() => toast.value = null, 2400);
    };

    const modals = reactive({
      prof: false, aluno: false, nucleo: false, aula: false,
      responsavel: false, financeiro: false, dados: false,
      compartilhar: false, cobranca: false
    });
    const form = reactive({ prof: {}, aluno: {}, nucleo: {}, aula: {}, responsavel: {} });
    const shareMesOffset = ref(0);

    // ── COBRANÇA ──────────────────────────────────────────
    const cobrancaRespId = ref(null);
    const cobrancaMesOffset = ref(0);

    // ── COMPUTED ──────────────────────────────────────────

    const professoresAtivos = computed(() => professores.filter(p => p.ativo));
    const alunosAtivos = computed(() => alunos.filter(a => a.ativo));
    const aulasSorted = computed(() => [...aulas].sort((a, b) => b.data.localeCompare(a.data)));

    const homeRef = computed(() => getMonthRef(mesOffset.value));
    const mesAtualLabel = computed(() => {
      const d = new Date(homeRef.value.year, homeRef.value.month, 1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    });
    const aulasMes = computed(() =>
      aulasSorted.value.filter(a => aulaInMonth(a, homeRef.value.year, homeRef.value.month))
    );
    const totalMes = computed(() => aulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
    const totalPresencasMes = computed(() => aulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

    const finRef = computed(() => getMonthRef(finMesOffset.value));
    const finMesLabel = computed(() => {
      const d = new Date(finRef.value.year, finRef.value.month, 1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    });
    const finAulasMes = computed(() =>
      aulasSorted.value.filter(a => aulaInMonth(a, finRef.value.year, finRef.value.month))
    );
    const finTotal = computed(() => finAulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
    const finTotalPresencas = computed(() => finAulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

    const finFechamento = computed(() => {
      const map = {};
      for (const aula of finAulasMes.value) {
        const vpp = calcValorPorPeso(aula);
        for (const ap of aula.professores) {
          if (!map[ap.professorId]) {
            map[ap.professorId] = { profId: ap.professorId, nome: getProfNome(ap.professorId), total: 0, numAulas: 0, pesoTotal: 0 };
          }
          map[ap.professorId].total += ap.pesoAplicado * vpp;
          map[ap.professorId].numAulas += 1;
          map[ap.professorId].pesoTotal += ap.pesoAplicado;
        }
      }
      return Object.values(map)
        .map(p => ({ ...p, pesoMedio: p.numAulas > 0 ? p.pesoTotal / p.numAulas : 0 }))
        .sort((a, b) => b.total - a.total);
    });

    const alunosAtivosForm = computed(() => {
      if (!form.aula.alunos) return alunosAtivos.value;
      const idsNaAula = form.aula.alunos.map(a => a.alunoId);
      const extras = alunos.filter(a => !a.ativo && idsNaAula.includes(a.id));
      return [...alunosAtivos.value, ...extras];
    });

    // ── RESPONSÁVEIS COMPUTED ──────────────────────────────

    // Alunos vinculados a um responsável
    const getAlunosDoResponsavel = (respId) =>
      alunos.filter(a => a.responsavelId === respId);

    // Resumo de cobrança de um responsável em um mês
    const getCobrancaResponsavel = (respId, year, month) => {
      const meuAlunos = getAlunosDoResponsavel(respId);
      const aulasDoPeriodo = aulasSorted.value.filter(a => aulaInMonth(a, year, month));
      const itens = [];
      let total = 0;
      for (const al of meuAlunos) {
        const presencas = [];
        for (const aula of aulasDoPeriodo) {
          const reg = aula.alunos.find(a => a.alunoId === al.id && a.presente);
          if (reg) {
            presencas.push({ data: aula.data, valor: reg.valorPago || 0, nucleoId: aula.nucleoId });
            total += reg.valorPago || 0;
          }
        }
        if (presencas.length > 0) {
          itens.push({ alunoId: al.id, nome: al.nome, presencas, subtotal: presencas.reduce((s, p) => s + p.valor, 0) });
        }
      }
      return { itens, total };
    };

    const cobrancaRef = computed(() => getMonthRef(cobrancaMesOffset.value));
    const cobrancaMesLabel = computed(() => {
      const d = new Date(cobrancaRef.value.year, cobrancaRef.value.month, 1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    });
    const cobrancaAtual = computed(() => {
      if (!cobrancaRespId.value) return { itens: [], total: 0 };
      return getCobrancaResponsavel(cobrancaRespId.value, cobrancaRef.value.year, cobrancaRef.value.month);
    });
    const cobrancaResp = computed(() => responsaveis.find(r => r.id === cobrancaRespId.value) || null);

    // Texto de cobrança para compartilhar
    const textoCobranca = computed(() => {
      const resp = cobrancaResp.value;
      if (!resp) return '';
      const mes = cobrancaMesLabel.value.charAt(0).toUpperCase() + cobrancaMesLabel.value.slice(1);
      const { itens, total } = cobrancaAtual.value;
      const linhas = [];
      linhas.push(`Mentes em Xeque — Cobrança ${mes}`);
      linhas.push(`Responsável: ${resp.nome}`);
      linhas.push(`${'─'.repeat(32)}`);
      if (itens.length === 0) {
        linhas.push('Nenhuma presença registrada neste mês.');
      } else {
        for (const item of itens) {
          linhas.push(`\n ${item.nome}`);
          for (const p of item.presencas) {
            const [y, m, d] = p.data.split('-');
            linhas.push(`  ${d}/${m}/${y} — ${getNucleoNome(p.nucleoId)} — R$ ${p.valor.toFixed(2)}`);
          }
          linhas.push(`  Subtotal: R$ ${item.subtotal.toFixed(2)} (${item.presencas.length} aula${item.presencas.length > 1 ? 's' : ''})`);
        }
        linhas.push(`\n${'─'.repeat(32)}`);
        linhas.push(`Total: R$ ${total.toFixed(2)}`);
        if (resp.telefone) linhas.push(`\nChave Pix: xadrez.cesamar@gmail.com`);
      }
      linhas.push(`\n— gerado pelo Mentes em Xeque`);
      return linhas.join('\n');
    });

    // ── HELPERS ──────────────────────────────────────────
    const getNucleoNome = (id) => (nucleos.find(n => n.id === id) || {}).nome || '—';
    const getProfNome = (id) => (professores.find(p => p.id === id) || {}).nome || '—';
    const getAlunoNome = (id) => (alunos.find(a => a.id === id) || {}).nome || '—';
    const getResponsavelNome = (id) => (responsaveis.find(r => r.id === id) || {}).nome || '—';
    const getProfNomes = (aula) => aula.professores.map(ap => getProfNome(ap.professorId)).join(', ') || '—';
    const alunosPresentes = (aula) => aula.alunos.filter(a => a.presente).length;
    const formatDate = (d) => {
      if (!d) return '';
      const [y, m, dd] = d.split('-');
      return `${dd}/${m}/${y}`;
    };

    // ── FINANCIAL CALC ──────────────────────────────────
    const calcTotal = (aula) => aula.alunos.filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);
    const calcPesoTotal = (aula) => aula.professores.reduce((s, p) => s + p.pesoAplicado, 0);
    const calcValorPorPeso = (aula) => {
      const pt = calcPesoTotal(aula);
      return pt > 0 ? calcTotal(aula) / pt : 0;
    };

    // ── PROFESSOR ────────────────────────────────────────
    const openModalProf = (prof) => {
      if (prof) { Object.assign(form.prof, { ...prof }); }
      else { form.prof = { id: null, nome: '', nivel: 'professor', peso: 1.5, ativo: true }; }
      modals.prof = true;
    };
    const applyPesoSugerido = () => {
      const map = { principal: 2, professor: 1.5, auxiliar: 1, trainee: 0.5 };
      form.prof.peso = map[form.prof.nivel] ?? 1;
    };
    const salvarProf = () => {
      if (!form.prof.nome.trim()) { showToast('Informe o nome do professor.'); return; }
      if (form.prof.id) {
        const i = professores.findIndex(p => p.id === form.prof.id);
        if (i >= 0) Object.assign(professores[i], { ...form.prof });
      } else {
        professores.push({ ...form.prof, id: genId() });
      }
      modals.prof = false;
      showToast('Professor salvo!');
    };
    const delProf = (id) => {
      const i = professores.findIndex(p => p.id === id);
      if (i >= 0) professores.splice(i, 1);
      showToast('Professor removido.');
    };

    // ── ALUNO ────────────────────────────────────────────
    const openModalAluno = (aluno) => {
      if (aluno) { Object.assign(form.aluno, { ...aluno }); }
      else { form.aluno = { id: null, nome: '', telefone: '', valorPadrao: 15, observacoes: '', ativo: true, responsavelId: '' }; }
      modals.aluno = true;
    };
    const salvarAluno = () => {
      if (!form.aluno.nome.trim()) { showToast('Informe o nome do aluno.'); return; }
      if (form.aluno.id) {
        const i = alunos.findIndex(a => a.id === form.aluno.id);
        if (i >= 0) Object.assign(alunos[i], { ...form.aluno });
      } else {
        alunos.push({ ...form.aluno, id: genId() });
      }
      modals.aluno = false;
      showToast('Aluno salvo!');
    };
    const delAluno = (id) => {
      const i = alunos.findIndex(a => a.id === id);
      if (i >= 0) alunos.splice(i, 1);
      showToast('Aluno removido.');
    };

    // ── NÚCLEO ────────────────────────────────────────────
    const openModalNucleo = (nucleo) => {
      if (nucleo) { Object.assign(form.nucleo, { ...nucleo }); }
      else { form.nucleo = { id: null, nome: '', endereco: '', observacoes: '' }; }
      modals.nucleo = true;
    };
    const salvarNucleo = () => {
      if (!form.nucleo.nome.trim()) { showToast('Informe o nome do núcleo.'); return; }
      if (form.nucleo.id) {
        const i = nucleos.findIndex(n => n.id === form.nucleo.id);
        if (i >= 0) Object.assign(nucleos[i], { ...form.nucleo });
      } else {
        nucleos.push({ ...form.nucleo, id: genId() });
      }
      modals.nucleo = false;
      showToast('Núcleo salvo!');
    };
    const delNucleo = (id) => {
      const i = nucleos.findIndex(n => n.id === id);
      if (i >= 0) nucleos.splice(i, 1);
      showToast('Núcleo removido.');
    };

    // ── RESPONSÁVEL ───────────────────────────────────────
    const openModalResponsavel = (resp) => {
      if (resp) { Object.assign(form.responsavel, { ...resp }); }
      else { form.responsavel = { id: null, nome: '', telefone: '', email: '', observacoes: '' }; }
      modals.responsavel = true;
    };
    const salvarResponsavel = () => {
      if (!form.responsavel.nome.trim()) { showToast('Informe o nome do responsável.'); return; }
      if (form.responsavel.id) {
        const i = responsaveis.findIndex(r => r.id === form.responsavel.id);
        if (i >= 0) Object.assign(responsaveis[i], { ...form.responsavel });
      } else {
        responsaveis.push({ ...form.responsavel, id: genId() });
      }
      modals.responsavel = false;
      showToast('Responsável salvo!');
    };
    const delResponsavel = (id) => {
      // Desvincular alunos
      for (const al of alunos.filter(a => a.responsavelId === id)) {
        al.responsavelId = '';
      }
      const i = responsaveis.findIndex(r => r.id === id);
      if (i >= 0) responsaveis.splice(i, 1);
      showToast('Responsável removido.');
    };

    const openCobranca = (resp) => {
      cobrancaRespId.value = resp.id;
      cobrancaMesOffset.value = 0;
      modals.cobranca = true;
    };

    const copiarCobranca = () => {
      navigator.clipboard.writeText(textoCobranca.value)
        .then(() => showToast('Cobrança copiada!'))
        .catch(() => showToast('Não foi possível copiar.'));
    };

    const compartilharCobranca = () => {
      const resp = cobrancaResp.value;
      navigator.share({
        title: `Cobrança — ${resp?.nome} — ${cobrancaMesLabel.value}`,
        text: textoCobranca.value,
      }).catch(() => { });
    };

    // WhatsApp direto
    const whatsappCobranca = () => {
      const resp = cobrancaResp.value;
      if (!resp?.telefone) { showToast('Responsável sem telefone cadastrado.'); return; }
      const numero = resp.telefone.replace(/\D/g, '');
      const texto = encodeURIComponent(textoCobranca.value);
      window.open(`https://wa.me/55${numero}?text=${texto}`, '_blank');
    };

    // ── AULA ─────────────────────────────────────────────
    const openNovaAula = () => {
      const today = new Date().toISOString().slice(0, 10);
      form.aula = { id: null, data: today, nucleoId: '', professores: [], alunos: [], observacoes: '' };
      modals.aula = true;
    };
    const editarAula = (aula) => {
      form.aula = JSON.parse(JSON.stringify(aula));
      const idsJaExistem = new Set(form.aula.alunos.map(a => a.alunoId));
      for (const al of alunos.filter(a => a.ativo)) {
        if (!idsJaExistem.has(al.id)) {
          form.aula.alunos.push({ alunoId: al.id, valorPago: al.valorPadrao, presente: false });
        }
      }
      modals.aula = true;
    };

    const aulaHasProf = (profId) => form.aula.professores?.some(p => p.professorId === profId);
    const toggleProfAula = (profId, peso) => {
      const idx = form.aula.professores.findIndex(p => p.professorId === profId);
      if (idx >= 0) form.aula.professores.splice(idx, 1);
      else form.aula.professores.push({ professorId: profId, pesoAplicado: peso });
    };

    const aulaAlunoPresente = (alunoId) => {
      const al = form.aula.alunos?.find(a => a.alunoId === alunoId);
      return al ? al.presente : false;
    };
    const getAlunoValor = (alunoId) => {
      const al = form.aula.alunos?.find(a => a.alunoId === alunoId);
      return al ? al.valorPago : '';
    };
    const toggleAlunoAula = (alunoId, valorPadrao, checked) => {
      const idx = form.aula.alunos.findIndex(a => a.alunoId === alunoId);
      if (idx >= 0) {
        form.aula.alunos[idx].presente = checked;
      } else {
        form.aula.alunos.push({ alunoId, valorPago: valorPadrao, presente: checked });
      }
    };
    const setAlunoValor = (alunoId, val) => {
      const idx = form.aula.alunos.findIndex(a => a.alunoId === alunoId);
      if (idx >= 0) form.aula.alunos[idx].valorPago = parseFloat(val) || 0;
    };
    const calcTotalForm = () => (form.aula.alunos || []).filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);

    const salvarAula = () => {
      if (!form.aula.data) { showToast('Informe a data da aula.'); return; }
      if (!form.aula.nucleoId) { showToast('Selecione o núcleo.'); return; }
      if (form.aula.id) {
        const i = aulas.findIndex(a => a.id === form.aula.id);
        if (i >= 0) Object.assign(aulas[i], { ...form.aula });
      } else {
        aulas.push({ ...form.aula, id: genId() });
      }
      modals.aula = false;
      showToast('Aula registrada!');
    };
    const delAula = (id) => {
      const i = aulas.findIndex(a => a.id === id);
      if (i >= 0) aulas.splice(i, 1);
      showToast('Aula removida.');
    };

    // ── COMPARTILHAR (fechamento geral) ───────────────────

    const shareRef = computed(() => getMonthRef(shareMesOffset.value));
    const shareMesLabel = computed(() => {
      const d = new Date(shareRef.value.year, shareRef.value.month, 1);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    });
    const shareAulasMes = computed(() =>
      aulasSorted.value.filter(a => aulaInMonth(a, shareRef.value.year, shareRef.value.month))
    );
    const shareTotal = computed(() => shareAulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
    const shareTotalPresencas = computed(() => shareAulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

    const shareFechamento = computed(() => {
      const map = {};
      for (const aula of shareAulasMes.value) {
        const vpp = calcValorPorPeso(aula);
        for (const ap of aula.professores) {
          if (!map[ap.professorId]) {
            map[ap.professorId] = { nome: getProfNome(ap.professorId), total: 0, numAulas: 0 };
          }
          map[ap.professorId].total += ap.pesoAplicado * vpp;
          map[ap.professorId].numAulas += 1;
        }
      }
      return Object.values(map).sort((a, b) => b.total - a.total);
    });

    const shareFrequenciaAlunos = computed(() => {
      const map = {};
      for (const aula of shareAulasMes.value) {
        for (const aa of aula.alunos) {
          if (!aa.presente) continue;
          if (!map[aa.alunoId]) {
            map[aa.alunoId] = { nome: getAlunoNome(aa.alunoId), numAulas: 0, totalPago: 0 };
          }
          map[aa.alunoId].numAulas += 1;
          map[aa.alunoId].totalPago += aa.valorPago || 0;
        }
      }
      return Object.values(map).sort((a, b) => b.numAulas - a.numAulas || b.totalPago - a.totalPago);
    });

    const shareResumoNucleos = computed(() => {
      const map = {};
      for (const aula of shareAulasMes.value) {
        const nId = aula.nucleoId;
        if (!map[nId]) {
          map[nId] = { nome: getNucleoNome(nId), numAulas: 0, total: 0, presencas: 0 };
        }
        map[nId].numAulas += 1;
        map[nId].total += calcTotal(aula);
        map[nId].presencas += alunosPresentes(aula);
      }
      return Object.values(map).sort((a, b) => b.total - a.total);
    });

    const textoCompartilhar = computed(() => {
      const mes = shareMesLabel.value.charAt(0).toUpperCase() + shareMesLabel.value.slice(1);
      const totalAulas = shareAulasMes.value.length;
      const totalPresencas = shareTotalPresencas.value;
      const mediaAlunosPorAula = totalAulas > 0 ? (totalPresencas / totalAulas).toFixed(1) : '0';
      const mediaArrecadacaoPorAula = totalAulas > 0 ? (shareTotal.value / totalAulas).toFixed(2) : '0.00';
      const mediaArrecadacaoPorAluno = totalPresencas > 0 ? (shareTotal.value / totalPresencas).toFixed(2) : '0.00';

      const linhas = [];
      linhas.push(`♟ Clube de Xadrez — Fechamento ${mes}`);
      linhas.push(`${'═'.repeat(34)}`);
      linhas.push(`📋 Resumo Geral`);
      linhas.push(`  Aulas realizadas : ${totalAulas}`);
      linhas.push(`  Total de presenças: ${totalPresencas}`);
      linhas.push(`  Alunos únicos     : ${shareFrequenciaAlunos.value.length}`);
      linhas.push(`  Média alunos/aula : ${mediaAlunosPorAula}`);
      linhas.push('');
      linhas.push(`💰 Financeiro`);
      linhas.push(`  Total arrecadado  : R$ ${shareTotal.value.toFixed(2)}`);
      linhas.push(`  Média por aula    : R$ ${mediaArrecadacaoPorAula}`);
      linhas.push(`  Média por aluno/aula: R$ ${mediaArrecadacaoPorAluno}`);
      linhas.push('');

      if (shareResumoNucleos.value.length > 0) {
        linhas.push(`🏫 Por Núcleo`);
        for (const n of shareResumoNucleos.value) {
          linhas.push(`  ${n.nome}`);
          linhas.push(`    ${n.numAulas} aula(s) · ${n.presencas} presenças · R$ ${n.total.toFixed(2)}`);
        }
        linhas.push('');
      }

      if (shareFechamento.value.length > 0) {
        linhas.push(`💵 Pagamento dos Professores`);
        for (const fp of shareFechamento.value) {
          linhas.push(`  • ${fp.nome}: R$ ${fp.total.toFixed(2)} (${fp.numAulas} aula${fp.numAulas > 1 ? 's' : ''})`);
        }
        linhas.push('');
      }

      if (shareFrequenciaAlunos.value.length > 0) {
        linhas.push(`👥 Frequência dos Alunos`);
        for (const al of shareFrequenciaAlunos.value) {
          const freq = totalAulas > 0 ? Math.round((al.numAulas / totalAulas) * 100) : 0;
          linhas.push(`  • ${al.nome}: ${al.numAulas}/${totalAulas} aula(s) (${freq}%) · R$ ${al.totalPago.toFixed(2)}`);
        }
        linhas.push('');
      }

      if (shareAulasMes.value.length > 0) {
        linhas.push(`📅 Detalhes das Aulas`);
        for (const aula of shareAulasMes.value) {
          const total = calcTotal(aula);
          const profs = getProfNomes(aula);
          const nAlunos = alunosPresentes(aula);
          linhas.push(`  ${formatDate(aula.data)} — ${getNucleoNome(aula.nucleoId)}`);
          linhas.push(`    👤 ${nAlunos} aluno(s)  💰 R$ ${total.toFixed(2)}  🎓 ${profs}`);
          if (aula.observacoes) linhas.push(`    📝 ${aula.observacoes}`);
        }
      }

      linhas.push('');
      linhas.push(`— gerado pelo Clube de Xadrez App`);
      return linhas.join('\n');
    });

    const podeCompartilharNativo = computed(() => !!navigator.share);

    const abrirCompartilharMes = () => {
      shareMesOffset.value = 0;
      modals.dados = false;
      modals.compartilhar = true;
    };

    const copiarTexto = () => {
      navigator.clipboard.writeText(textoCompartilhar.value)
        .then(() => showToast('Texto copiado!'))
        .catch(() => showToast('Não foi possível copiar.'));
    };

    const compartilharNativo = () => {
      navigator.share({
        title: `Clube de Xadrez — ${shareMesLabel.value}`,
        text: textoCompartilhar.value,
      }).catch(() => { });
    };

    // ── EXPORT / IMPORT ──────────────────────────────────
    const exportarJSON = () => {
      const dados = { professores: [...professores], alunos: [...alunos], nucleos: [...nucleos], aulas: [...aulas], responsaveis: [...responsaveis] };
      const json = JSON.stringify(dados, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const hoje = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `xadrez-backup-${hoje}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup exportado!');
    };

    const importarJSON = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dados = JSON.parse(e.target.result);
          if (!dados.professores || !dados.alunos || !dados.nucleos || !dados.aulas) {
            showToast('Arquivo inválido. Verifique o formato.'); return;
          }
          professores.splice(0, professores.length, ...dados.professores);
          alunos.splice(0, alunos.length, ...dados.alunos);
          nucleos.splice(0, nucleos.length, ...dados.nucleos);
          aulas.splice(0, aulas.length, ...dados.aulas);
          if (dados.responsaveis) responsaveis.splice(0, responsaveis.length, ...dados.responsaveis);
          modals.dados = false;
          showToast(`Importado: ${dados.aulas.length} aulas, ${dados.professores.length} profs, ${dados.alunos.length} alunos.`);
        } catch {
          showToast('Erro ao ler o arquivo JSON.');
        }
        event.target.value = '';
      };
      reader.readAsText(file);
    };

    const limparTudo = () => {
      professores.splice(0);
      alunos.splice(0);
      nucleos.splice(0);
      aulas.splice(0);
      responsaveis.splice(0);
      showToast('Todos os dados foram removidos.');
    };

    const closeDadosModal = () => { modals.dados = false; };

    const openFinanceiro = (aula) => {
      aulaFinanceiro.value = aula;
      modals.financeiro = true;
    };

    return {
      view, toast, confirmDel, modals, form,
      professores, alunos, nucleos, aulas, responsaveis,
      professoresAtivos, alunosAtivos, alunosAtivosForm,
      aulasSorted,
      // Home
      mesOffset, mesAtualLabel, aulasMes, totalMes, totalPresencasMes,
      // Financeiro tab
      finMesOffset, finMesLabel, finAulasMes, finTotal, finTotalPresencas, finFechamento,
      aulaFinanceiro,
      // Responsáveis
      getAlunosDoResponsavel, getResponsavelNome,
      openModalResponsavel, salvarResponsavel, delResponsavel,
      openCobranca, cobrancaRespId, cobrancaMesOffset, cobrancaMesLabel,
      cobrancaAtual, cobrancaResp, textoCobranca,
      copiarCobranca, compartilharCobranca, whatsappCobranca,
      // Compartilhar
      shareMesOffset, shareMesLabel, textoCompartilhar, podeCompartilharNativo,
      abrirCompartilharMes, copiarTexto, compartilharNativo,
      // Export / Import
      exportarJSON, importarJSON, limparTudo, closeDadosModal,
      // helpers
      getNucleoNome, getProfNome, getAlunoNome, getProfNomes, alunosPresentes, formatDate,
      calcTotal, calcPesoTotal, calcValorPorPeso,
      // prof
      openModalProf, applyPesoSugerido, salvarProf, delProf,
      // aluno
      openModalAluno, salvarAluno, delAluno,
      // nucleo
      openModalNucleo, salvarNucleo, delNucleo,
      // aula
      openNovaAula, editarAula, salvarAula, delAula,
      aulaHasProf, toggleProfAula,
      aulaAlunoPresente, getAlunoValor, toggleAlunoAula, setAlunoValor, calcTotalForm,
      openFinanceiro,
    };
  }
}).mount('#app');
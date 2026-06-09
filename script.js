const { createApp, reactive, computed, watch, ref } = Vue;
const STORAGE_KEY = 'xadrez-v2';

function loadData() {
    try {
        const v2 = JSON.parse(localStorage.getItem('xadrez-v2'));
        if (v2) return v2;
        const v1 = JSON.parse(localStorage.getItem('xadrez-v1'));
        if (v1) {
            if (v1.aulas) {
                v1.aulas.forEach(aula => {
                    if (aula.alunos) aula.alunos.forEach(al => { if (al.pago === undefined) al.pago = true; });
                });
            }
            return v1;
        }
        return {};
    } catch (e) { return {}; }
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getMonthRef(offset) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
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
        const finAgrupamento = ref('lista');
        const pendMesOffset = ref(0);

        const professores = reactive(saved.professores || []);
        const alunos = reactive(saved.alunos || []);
        const nucleos = reactive(saved.nucleos || []);
        const aulas = reactive(saved.aulas || []);
        const responsaveis = reactive(saved.responsaveis || []);

        const persistAll = () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ professores, alunos, nucleos, aulas, responsaveis }));
        };
        watch([professores, alunos, nucleos, aulas, responsaveis], persistAll, { deep: true });

        const showToast = (msg) => { toast.value = msg; setTimeout(() => toast.value = null, 2400); };
        const modals = reactive({ prof: false, aluno: false, nucleo: false, aula: false, financeiro: false, dados: false, compartilhar: false, resp: false });
        const form = reactive({ prof: {}, aluno: {}, nucleo: {}, aula: {}, resp: {} });
        const shareMesOffset = ref(0);

        // ── COMPUTED ──
        const professoresAtivos = computed(() => professores.filter(p => p.ativo));
        const alunosAtivos = computed(() => alunos.filter(a => a.ativo));
        const responsaveisAtivos = computed(() => responsaveis.filter(r => r.ativo));
        const aulasSorted = computed(() => [...aulas].sort((a, b) => b.data.localeCompare(a.data)));

        const homeRef = computed(() => getMonthRef(mesOffset.value));
        const mesAtualLabel = computed(() => {
            const d = new Date(homeRef.value.year, homeRef.value.month, 1);
            return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        });
        const aulasMes = computed(() => aulasSorted.value.filter(a => aulaInMonth(a, homeRef.value.year, homeRef.value.month)));
        const totalMes = computed(() => aulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
        const totalPresencasMes = computed(() => aulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

        // ── PENDÊNCIAS ──
        const todasPendencias = computed(() => {
            const map = {};
            for (const aula of aulas) {
                for (const aa of aula.alunos) {
                    if (aa.presente && !aa.pago) {
                        if (!map[aa.alunoId]) {
                            const alunoObj = alunos.find(a => a.id === aa.alunoId);
                            const respObj = alunoObj && alunoObj.responsavelId ? responsaveis.find(r => r.id === alunoObj.responsavelId) : null;
                            map[aa.alunoId] = {
                                alunoId: aa.alunoId,
                                nome: getAlunoNome(aa.alunoId),
                                responsavel: respObj ? respObj.nome : null,
                                responsavelTel: respObj ? respObj.telefone : null,
                                aulas: [],
                                total: 0
                            };
                        }
                        map[aa.alunoId].aulas.push({ aulaId: aula.id, data: aula.data, nucleoId: aula.nucleoId, valor: aa.valorPago || 0 });
                        map[aa.alunoId].total += aa.valorPago || 0;
                    }
                }
            }
            return Object.values(map).sort((a, b) => b.total - a.total);
        });

        const totalPendenciasGeral = computed(() => todasPendencias.value.length);
        const totalPendenciasGeralValor = computed(() => todasPendencias.value.reduce((s, p) => s + p.total, 0));

        const pendRef = computed(() => pendMesOffset.value !== null ? getMonthRef(pendMesOffset.value) : null);
        const pendMesLabel = computed(() => {
            if (!pendRef.value) return 'Todas';
            const d = new Date(pendRef.value.year, pendRef.value.month, 1);
            return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        });
        const pendenciasFiltradas = computed(() => {
            if (pendMesOffset.value === null) return todasPendencias.value;
            const { year, month } = pendRef.value;
            return todasPendencias.value
                .map(pa => ({
                    ...pa,
                    aulas: pa.aulas.filter(item => {
                        const [y, m] = item.data.split('-').map(Number);
                        return y === year && (m - 1) === month;
                    })
                }))
                .filter(pa => pa.aulas.length > 0)
                .map(pa => ({ ...pa, total: pa.aulas.reduce((s, i) => s + i.valor, 0) }));
        });

        const pendenciasDoMes = computed(() => {
            const { year, month } = homeRef.value;
            return todasPendencias.value
                .map(pa => ({ ...pa, aulas: pa.aulas.filter(item => { const [y, m] = item.data.split('-').map(Number); return y === year && (m - 1) === month; }) }))
                .filter(pa => pa.aulas.length > 0);
        });
        const totalPendenciasMes = computed(() => pendenciasDoMes.value.reduce((s, p) => s + p.total, 0));

        const aulaTempendencia = (aula) => aula.alunos.some(aa => aa.presente && !aa.pago);
        const contarPendenciasAula = (aula) => aula.alunos.filter(aa => aa.presente && !aa.pago).length;
        const getPendenciasAluno = (alunoId) => { const pa = todasPendencias.value.find(p => p.alunoId === alunoId); return pa ? pa.aulas : []; };

        const marcarPago = (aulaId, alunoId) => {
            const aula = aulas.find(a => a.id === aulaId);
            if (!aula) return;
            const aa = aula.alunos.find(a => a.alunoId === alunoId);
            if (aa) { aa.pago = true; showToast('Pagamento confirmado!'); }
        };
        const marcarTodosPagos = (pa) => { for (const item of pa.aulas) marcarPago(item.aulaId, pa.alunoId); };

        // ── FINANCEIRO ──
        const finRef = computed(() => getMonthRef(finMesOffset.value));
        const finMesLabel = computed(() => { const d = new Date(finRef.value.year, finRef.value.month, 1); return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); });
        const finAulasMes = computed(() => aulasSorted.value.filter(a => aulaInMonth(a, finRef.value.year, finRef.value.month)));
        const finTotal = computed(() => finAulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
        const finTotalPresencas = computed(() => finAulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0));

        const finPorNucleo = computed(() => {
            const map = {};
            for (const aula of finAulasMes.value) {
                const id = aula.nucleoId || '__sem_nucleo__';
                if (!map[id]) map[id] = { nucleoId: id, nome: getNucleoNome(aula.nucleoId), total: 0, numAulas: 0, numPresencas: 0 };
                map[id].total += calcTotal(aula); map[id].numAulas += 1; map[id].numPresencas += alunosPresentes(aula);
            }
            return Object.values(map).sort((a, b) => b.total - a.total);
        });

        const finAulasPorNucleo = computed(() => {
            const map = {};
            for (const aula of finAulasMes.value) {
                const id = aula.nucleoId || '__sem_nucleo__';
                if (!map[id]) map[id] = { nucleoId: id, nome: getNucleoNome(aula.nucleoId), aulas: [], total: 0 };
                map[id].aulas.push(aula); map[id].total += calcTotal(aula);
            }
            return Object.values(map).sort((a, b) => b.total - a.total);
        });

        const NUCLEO_COLORS = ['#c9a84c', '#2e7d32', '#1565c0', '#7b1fa2', '#e65100', '#00838f', '#558b2f', '#d84315'];
        const finFechamento = computed(() => {
            const map = {};
            for (const aula of finAulasMes.value) {
                const vpp = calcValorPorPeso(aula);
                const nucId = aula.nucleoId || '__sem_nucleo__';
                for (const ap of aula.professores) {
                    if (!map[ap.professorId]) map[ap.professorId] = { profId: ap.professorId, nome: getProfNome(ap.professorId), total: 0, numAulas: 0, pesoTotal: 0, nucleoMap: {} };
                    const gain = ap.pesoAplicado * vpp;
                    map[ap.professorId].total += gain; map[ap.professorId].numAulas += 1; map[ap.professorId].pesoTotal += ap.pesoAplicado;
                    if (!map[ap.professorId].nucleoMap[nucId]) map[ap.professorId].nucleoMap[nucId] = { valor: 0, numAulas: 0 };
                    map[ap.professorId].nucleoMap[nucId].valor += gain; map[ap.professorId].nucleoMap[nucId].numAulas += 1;
                }
            }
            const nucleoIds = [...new Set(finAulasMes.value.map(a => a.nucleoId || '__sem_nucleo__'))];
            const colorMap = {}; nucleoIds.forEach((id, i) => { colorMap[id] = NUCLEO_COLORS[i % NUCLEO_COLORS.length]; });
            return Object.values(map)
                .map(p => ({
                    ...p,
                    pesoMedio: p.numAulas > 0 ? p.pesoTotal / p.numAulas : 0,
                    porNucleo: Object.entries(p.nucleoMap).map(([nucId, data]) => ({ nucleoId: nucId, nome: getNucleoNome(nucId === '__sem_nucleo__' ? null : nucId), valor: data.valor, numAulas: data.numAulas, cor: colorMap[nucId] || '#888' })).sort((a, b) => b.valor - a.valor)
                }))
                .sort((a, b) => b.total - a.total);
        });

        const profDetalheAberto = reactive({});
        const toggleProfDetalhe = (profId) => { profDetalheAberto[profId] = !profDetalheAberto[profId]; };

        const alunosAtivosForm = computed(() => {
            if (!form.aula.alunos) return alunosAtivos.value;
            const idsNaAula = form.aula.alunos.map(a => a.alunoId);
            const extras = alunos.filter(a => !a.ativo && idsNaAula.includes(a.id));
            return [...alunosAtivos.value, ...extras];
        });

        // ── HELPERS ──
        const getNucleoNome = (id) => (nucleos.find(n => n.id === id) || {}).nome || '—';
        const getProfNome = (id) => (professores.find(p => p.id === id) || {}).nome || '—';
        const getAlunoNome = (id) => (alunos.find(a => a.id === id) || {}).nome || '—';
        const getRespNome = (id) => (responsaveis.find(r => r.id === id) || {}).nome || '—';
        const getProfNomes = (aula) => aula.professores.map(ap => getProfNome(ap.professorId)).join(', ') || '—';
        const alunosPresentes = (aula) => aula.alunos.filter(a => a.presente).length;
        const formatDate = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
        const getAlunosDoResponsavel = (respId) => alunos.filter(a => a.responsavelId === respId);
        const getAlunoResponsavel = (alunoId) => {
            const al = alunos.find(a => a.id === alunoId);
            if (!al || !al.responsavelId) return null;
            return getRespNome(al.responsavelId);
        };

        // ── FINANCIAL CALC ──
        const calcTotal = (aula) => aula.alunos.filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);
        const calcPesoTotal = (aula) => aula.professores.reduce((s, p) => s + p.pesoAplicado, 0);
        const calcValorPorPeso = (aula) => { const pt = calcPesoTotal(aula); return pt > 0 ? calcTotal(aula) / pt : 0; };

        // ── RESPONSÁVEL ──
        const openModalResp = (resp) => {
            if (resp) { Object.assign(form.resp, { ...resp }); }
            else { form.resp = { id: null, nome: '', telefone: '', email: '', observacoes: '', ativo: true }; }
            modals.resp = true;
        };
        const salvarResp = () => {
            if (!form.resp.nome.trim()) { showToast('Informe o nome do responsável.'); return; }
            if (form.resp.id) {
                const i = responsaveis.findIndex(r => r.id === form.resp.id);
                if (i >= 0) Object.assign(responsaveis[i], { ...form.resp });
            } else {
                responsaveis.push({ ...form.resp, id: genId() });
            }
            modals.resp = false; showToast('Responsável salvo!');
        };
        const delResp = (id) => {
            // Remove vínculo dos alunos
            alunos.forEach(a => { if (a.responsavelId === id) a.responsavelId = ''; });
            responsaveis.splice(responsaveis.findIndex(r => r.id === id), 1);
            showToast('Responsável removido.');
        };

        // ── PROFESSOR ──
        const openModalProf = (prof) => {
            if (prof) { Object.assign(form.prof, { ...prof }); }
            else { form.prof = { id: null, nome: '', nivel: 'professor', peso: 1.5, ativo: true }; }
            modals.prof = true;
        };
        const applyPesoSugerido = () => { const map = { principal: 2, professor: 1.5, auxiliar: 1, trainee: 0.5 }; form.prof.peso = map[form.prof.nivel] ?? 1; };
        const salvarProf = () => {
            if (!form.prof.nome.trim()) { showToast('Informe o nome do professor.'); return; }
            if (form.prof.id) { const i = professores.findIndex(p => p.id === form.prof.id); if (i >= 0) Object.assign(professores[i], { ...form.prof }); }
            else { professores.push({ ...form.prof, id: genId() }); }
            modals.prof = false; showToast('Professor salvo!');
        };
        const delProf = (id) => { professores.splice(professores.findIndex(p => p.id === id), 1); showToast('Professor removido.'); };

        // ── ALUNO ──
        const openModalAluno = (aluno) => {
            if (aluno) { Object.assign(form.aluno, { ...aluno }); }
            else { form.aluno = { id: null, nome: '', telefone: '', responsavelId: '', valorPadrao: 15, observacoes: '', ativo: true }; }
            modals.aluno = true;
        };
        const salvarAluno = () => {
            if (!form.aluno.nome.trim()) { showToast('Informe o nome do aluno.'); return; }
            if (form.aluno.id) { const i = alunos.findIndex(a => a.id === form.aluno.id); if (i >= 0) Object.assign(alunos[i], { ...form.aluno }); }
            else { alunos.push({ ...form.aluno, id: genId() }); }
            modals.aluno = false; showToast('Aluno salvo!');
        };
        const delAluno = (id) => { alunos.splice(alunos.findIndex(a => a.id === id), 1); showToast('Aluno removido.'); };

        // ── NÚCLEO ──
        const openModalNucleo = (nucleo) => {
            if (nucleo) { Object.assign(form.nucleo, { ...nucleo }); }
            else { form.nucleo = { id: null, nome: '', endereco: '', observacoes: '' }; }
            modals.nucleo = true;
        };
        const salvarNucleo = () => {
            if (!form.nucleo.nome.trim()) { showToast('Informe o nome do núcleo.'); return; }
            if (form.nucleo.id) { const i = nucleos.findIndex(n => n.id === form.nucleo.id); if (i >= 0) Object.assign(nucleos[i], { ...form.nucleo }); }
            else { nucleos.push({ ...form.nucleo, id: genId() }); }
            modals.nucleo = false; showToast('Núcleo salvo!');
        };
        const delNucleo = (id) => { nucleos.splice(nucleos.findIndex(n => n.id === id), 1); showToast('Núcleo removido.'); };

        // ── AULA ──
        const openNovaAula = () => {
            const today = new Date().toISOString().slice(0, 10);
            form.aula = { id: null, data: today, nucleoId: '', professores: [], alunos: [], observacoes: '' };
            modals.aula = true;
        };
        const editarAula = (aula) => {
            form.aula = JSON.parse(JSON.stringify(aula));
            const idsJaExistem = new Set(form.aula.alunos.map(a => a.alunoId));
            for (const al of alunos.filter(a => a.ativo)) {
                if (!idsJaExistem.has(al.id)) form.aula.alunos.push({ alunoId: al.id, valorPago: al.valorPadrao, presente: false, pago: true });
            }
            modals.aula = true;
        };
        const aulaHasProf = (profId) => form.aula.professores?.some(p => p.professorId === profId);
        const toggleProfAula = (profId, peso) => {
            const idx = form.aula.professores.findIndex(p => p.professorId === profId);
            if (idx >= 0) form.aula.professores.splice(idx, 1);
            else form.aula.professores.push({ professorId: profId, pesoAplicado: peso });
        };
        const aulaAlunoPresente = (alunoId) => { const al = form.aula.alunos?.find(a => a.alunoId === alunoId); return al ? al.presente : false; };
        const getAlunoValor = (alunoId) => { const al = form.aula.alunos?.find(a => a.alunoId === alunoId); return al ? al.valorPago : ''; };
        const getAlunoPago = (alunoId) => { const al = form.aula.alunos?.find(a => a.alunoId === alunoId); return al ? (al.pago !== false) : true; };
        const setAlunoPago = (alunoId, pago) => { const idx = form.aula.alunos.findIndex(a => a.alunoId === alunoId); if (idx >= 0) form.aula.alunos[idx].pago = pago; };
        const toggleAlunoAula = (alunoId, valorPadrao, checked) => {
            const idx = form.aula.alunos.findIndex(a => a.alunoId === alunoId);
            if (idx >= 0) form.aula.alunos[idx].presente = checked;
            else form.aula.alunos.push({ alunoId, valorPago: valorPadrao, presente: checked, pago: true });
        };
        const setAlunoValor = (alunoId, val) => { const idx = form.aula.alunos.findIndex(a => a.alunoId === alunoId); if (idx >= 0) form.aula.alunos[idx].valorPago = parseFloat(val) || 0; };
        const calcTotalForm = () => (form.aula.alunos || []).filter(a => a.presente).reduce((s, a) => s + (a.valorPago || 0), 0);
        const salvarAula = () => {
            if (!form.aula.data) { showToast('Informe a data da aula.'); return; }
            if (!form.aula.nucleoId) { showToast('Selecione o núcleo.'); return; }
            if (form.aula.id) { const i = aulas.findIndex(a => a.id === form.aula.id); if (i >= 0) Object.assign(aulas[i], { ...form.aula }); }
            else { aulas.push({ ...form.aula, id: genId() }); }
            modals.aula = false; showToast('Aula registrada!');
        };
        const delAula = (id) => { aulas.splice(aulas.findIndex(a => a.id === id), 1); showToast('Aula removida.'); };

        // ── SHARE ──
        const shareRef = computed(() => getMonthRef(shareMesOffset.value));
        const shareMesLabel = computed(() => { const d = new Date(shareRef.value.year, shareRef.value.month, 1); return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); });
        const shareAulasMes = computed(() => aulasSorted.value.filter(a => aulaInMonth(a, shareRef.value.year, shareRef.value.month)));
        const shareTotal = computed(() => shareAulasMes.value.reduce((s, a) => s + calcTotal(a), 0));
        const shareFechamento = computed(() => {
            const map = {};
            for (const aula of shareAulasMes.value) {
                const vpp = calcValorPorPeso(aula);
                for (const ap of aula.professores) {
                    if (!map[ap.professorId]) map[ap.professorId] = { nome: getProfNome(ap.professorId), total: 0, numAulas: 0 };
                    map[ap.professorId].total += ap.pesoAplicado * vpp; map[ap.professorId].numAulas += 1;
                }
            }
            return Object.values(map).sort((a, b) => b.total - a.total);
        });
        const textoCompartilhar = computed(() => {
            const mes = shareMesLabel.value.charAt(0).toUpperCase() + shareMesLabel.value.slice(1);
            const linhas = [];
            linhas.push(`♟ Clube de Xadrez — ${mes}`);
            linhas.push(`${'─'.repeat(30)}`);
            linhas.push(`📋 Aulas realizadas: ${shareAulasMes.value.length}`);
            linhas.push(`👥 Total de presenças: ${shareAulasMes.value.reduce((s, a) => s + alunosPresentes(a), 0)}`);
            linhas.push(`💰 Total arrecadado: R$ ${shareTotal.value.toFixed(2)}`);
            const pends = todasPendencias.value.filter(p => p.aulas.some(item => { const [y, m] = item.data.split('-').map(Number); return y === shareRef.value.year && (m - 1) === shareRef.value.month; }));
            if (pends.length > 0) {
                const totalPend = pends.reduce((s, p) => s + p.aulas.filter(item => { const [y, m] = item.data.split('-').map(Number); return y === shareRef.value.year && (m - 1) === shareRef.value.month; }).reduce((ss, i) => ss + i.valor, 0), 0);
                linhas.push(`⚠️ Pendências: ${pends.length} aluno(s) · R$ ${totalPend.toFixed(2)}`);
            }
            linhas.push('');
            if (shareFechamento.value.length > 0) {
                linhas.push('💵 Pagamento dos professores:');
                for (const fp of shareFechamento.value) linhas.push(`  • ${fp.nome}: R$ ${fp.total.toFixed(2)} (${fp.numAulas} aula${fp.numAulas > 1 ? 's' : ''})`);
                linhas.push('');
            }
            if (shareAulasMes.value.length > 0) {
                linhas.push('📅 Aulas:');
                for (const aula of shareAulasMes.value) {
                    linhas.push(`  ${formatDate(aula.data)} — ${getNucleoNome(aula.nucleoId)}`);
                    linhas.push(`    ${alunosPresentes(aula)} aluno(s) · R$ ${calcTotal(aula).toFixed(2)} · ${getProfNomes(aula)}`);
                }
            }
            return linhas.join('\n');
        });
        const podeCompartilharNativo = computed(() => !!navigator.share);
        const abrirCompartilharMes = () => { shareMesOffset.value = 0; modals.dados = false; modals.compartilhar = true; };
        const copiarTexto = () => { navigator.clipboard.writeText(textoCompartilhar.value).then(() => showToast('Texto copiado!')).catch(() => showToast('Não foi possível copiar.')); };
        const compartilharNativo = () => { navigator.share({ title: `Clube de Xadrez — ${shareMesLabel.value}`, text: textoCompartilhar.value }).catch(() => { }); };

        // ── EXPORT / IMPORT ──
        const exportarJSON = () => {
            const dados = { professores: [...professores], alunos: [...alunos], nucleos: [...nucleos], aulas: [...aulas], responsaveis: [...responsaveis] };
            const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `xadrez-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
            URL.revokeObjectURL(url); showToast('Backup exportado!');
        };
        const importarJSON = (event) => {
            const file = event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const dados = JSON.parse(e.target.result);
                    if (!dados.professores || !dados.alunos || !dados.nucleos || !dados.aulas) { showToast('Arquivo inválido.'); return; }
                    professores.splice(0, professores.length, ...dados.professores);
                    alunos.splice(0, alunos.length, ...dados.alunos);
                    nucleos.splice(0, nucleos.length, ...dados.nucleos);
                    aulas.splice(0, aulas.length, ...dados.aulas);
                    responsaveis.splice(0, responsaveis.length, ...(dados.responsaveis || []));
                    modals.dados = false; showToast(`Importado: ${dados.aulas.length} aulas, ${dados.professores.length} profs.`);
                } catch { showToast('Erro ao ler o arquivo JSON.'); }
                event.target.value = '';
            };
            reader.readAsText(file);
        };
        const limparTudo = () => { professores.splice(0); alunos.splice(0); nucleos.splice(0); aulas.splice(0); responsaveis.splice(0); showToast('Todos os dados foram removidos.'); };
        const closeDadosModal = () => { modals.dados = false; };
        const openFinanceiro = (aula) => { aulaFinanceiro.value = aula; modals.financeiro = true; };

        return {
            view, toast, confirmDel, modals, form,
            professores, alunos, nucleos, aulas, responsaveis,
            professoresAtivos, alunosAtivos, responsaveisAtivos, alunosAtivosForm, aulasSorted,
            mesOffset, mesAtualLabel, aulasMes, totalMes, totalPresencasMes,
            finMesOffset, finMesLabel, finAulasMes, finTotal, finTotalPresencas, finFechamento,
            finPorNucleo, finAulasPorNucleo, finAgrupamento,
            profDetalheAberto, toggleProfDetalhe,
            pendMesOffset, pendMesLabel, pendenciasFiltradas, todasPendencias,
            totalPendenciasGeral, totalPendenciasGeralValor,
            pendenciasDoMes, totalPendenciasMes,
            aulaTempendencia, contarPendenciasAula, getPendenciasAluno,
            marcarPago, marcarTodosPagos,
            aulaFinanceiro,
            shareMesOffset, shareMesLabel, textoCompartilhar, podeCompartilharNativo,
            abrirCompartilharMes, copiarTexto, compartilharNativo,
            exportarJSON, importarJSON, limparTudo, closeDadosModal,
            getNucleoNome, getProfNome, getAlunoNome, getRespNome, getProfNomes,
            alunosPresentes, formatDate, getAlunosDoResponsavel, getAlunoResponsavel,
            calcTotal, calcPesoTotal, calcValorPorPeso,
            openModalResp, salvarResp, delResp,
            openModalProf, applyPesoSugerido, salvarProf, delProf,
            openModalAluno, salvarAluno, delAluno,
            openModalNucleo, salvarNucleo, delNucleo,
            openNovaAula, editarAula, salvarAula, delAula,
            aulaHasProf, toggleProfAula,
            aulaAlunoPresente, getAlunoValor, getAlunoPago, setAlunoPago,
            toggleAlunoAula, setAlunoValor, calcTotalForm,
            openFinanceiro,
        };
    }
}).mount('#app');
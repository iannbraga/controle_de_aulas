## Clube de Xadrez — Gestão de Aulas

Aplicação web **mobile-first** em **Vite + Vue 3 + TypeScript + Pinia + Bootstrap**, sem backend (por enquanto — ver "Próximos passos"), que persiste os dados no `localStorage` do navegador.

Este projeto foi migrado a partir de uma versão anterior em HTML/JS puro (Vue 3 via CDN, sem build). O formato dos dados salvos no `localStorage` (chave `xadrez-v2`) foi mantido — backups exportados pela versão antiga continuam podendo ser importados aqui.

---

### Desenvolvimento

```bash
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção (roda type-check com vue-tsc antes)
npm run preview   # serve o build de produção localmente
```

### Estrutura

```
src/
  types/domain.ts        # tipos das entidades (Professor, Aluno, Nucleo, Aula, ...)
  lib/helpers.ts          # funções puras (datas, cálculo financeiro)
  lib/reports.ts          # agrupamentos e textos de fechamento/compartilhamento
  lib/persistence.ts       # leitura/escrita no localStorage (compatível com v1/v2)
  stores/catalog.ts        # Pinia: professores, alunos, núcleos, responsáveis
  stores/aulas.ts           # Pinia: aulas, pendências, formulário de aula
  stores/ui.ts               # Pinia: navegação, modais, toasts, formulários de cadastro
  stores/persistPlugin.ts     # plugin Pinia que persiste catalog+aulas no localStorage
  components/views/           # telas (Home, Aulas, Financeiro, Pendências, Cadastros...)
  components/modals/           # modais (cadastro, aula, financeiro, compartilhar, WhatsApp)
  components/common/            # topbar, toast, confirmação, navegação inferior
```

**Cadastros**
Professor (nome, nível, peso financeiro, ativo/inativo), Aluno (nome, telefone, valor padrão por aula, observações, ativo/inativo), Responsável (pai/mãe do aluno) e Núcleo (nome, endereço, observações).

**Registro de aulas**
Cada aula vincula um núcleo, um ou mais professores (com peso registrado no momento da aula, garantindo auditabilidade histórica) e a lista completa de alunos ativos com presença marcada individualmente e valor pago editável por aluno.

**Divisão financeira automática**
A cada aula o sistema calcula: total arrecadado → soma dos pesos dos professores presentes → valor por peso → pagamento individual de cada professor. Peso 0 é suportado para trainees observadores.

**Dashboard mensal (Home)**, **tela Financeiro** (fechamento consolidado por período), **Pendências** (controle de alunos com aulas não pagas), **Compartilhamento** de fechamento (texto formatado pra WhatsApp) e cobrança individual por responsável via WhatsApp com chave Pix.

**Exportação / Importação**
Backup completo em `.json` para migração entre dispositivos ou compartilhamento.

---

## Lógica de Divisão Financeira

O dinheiro arrecadado numa aula é dividido proporcionalmente ao peso de cada professor presente.

**Passo 1 — Total arrecadado**: soma tudo que os alunos presentes pagaram naquela aula.
> 6 alunos × R$ 15 + 1 aluno × R$ 20 = **R$ 110**

**Passo 2 — Soma dos pesos**: cada professor tem um peso que representa sua responsabilidade/nível naquela aula.

| Nível | Peso |
|---|---|
| Principal | 2 |
| Professor | 1,5 |
| Auxiliar | 1 |
| Trainee | 0,5 |
| Observador | 0 |

O peso é salvo **no momento do registro da aula**, então se o professor mudar de nível depois, as aulas antigas não são afetadas.

**Passo 3 — Valor por peso**: total arrecadado ÷ soma dos pesos.
> R$ 110 ÷ 3,5 = **R$ 31,43 por peso**

**Passo 4 — Pagamento de cada professor**: peso individual × valor por peso.

| Professor | Peso | Cálculo | Recebe |
|---|---|---|---|
| Principal | 2 | 2 × R$ 31,43 | **R$ 62,86** |
| Auxiliar | 1 | 1 × R$ 31,43 | **R$ 31,43** |
| Trainee | 0,5 | 0,5 × R$ 31,43 | **R$ 15,71** |
| **Total** | **3,5** | | **R$ 110,00** ✓ |

O total dos pagamentos sempre fecha exatamente igual ao total arrecadado — nenhum centavo se perde. O peso não é um percentual fixo, é uma **razão relativa**: se o Principal der uma aula sozinho, ele fica com 100% do valor.

---

## Próximos passos

- **Supabase**: substituir a persistência local (`localStorage`) por um backend real (auth, sincronização entre dispositivos, múltiplos usuários).
- Controle de inadimplência mais robusto, histórico individual do aluno, exportação PDF/Excel, relatórios avançados.

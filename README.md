## Clube de Xadrez — Gestão de Aulas

Aplicação web **mobile-first** em HTML/CSS/JS puro (Vue 3 + Bootstrap via CDN), sem backend, que roda direto no navegador e persiste dados no `localStorage`.

---

**Cadastros**
Professor (nome, nível, peso financeiro, ativo/inativo), Aluno (nome, telefone, valor padrão por aula, observações, ativo/inativo), e Núcleo (nome, endereço, observações).

**Registro de aulas**
Cada aula vincula um núcleo, um ou mais professores (com peso registrado no momento da aula, garantindo auditabilidade histórica) e a lista completa de alunos ativos com presença marcada individualmente e valor pago editável por aluno.

**Divisão financeira automática**
A cada aula o sistema calcula: total arrecadado → soma dos pesos dos professores presentes → valor por peso → pagamento individual de cada professor. A lógica segue exatamente as fórmulas do roadmap. Peso 0 é suportado para trainees observadores.

**Dashboard mensal (Home)**
Exibe aulas, presenças, média por aula e arrecadação filtrados pelo mês, com navegação entre meses via `‹ ›`.

**Tela Financeiro**
Fechamento consolidado por período: total arrecadado, presença total, média por aula, e tabela de pagamento por professor com número de aulas no período e peso médio aplicado. Também navegável por mês.

**Modal de divisão por aula**
Detalhe completo de qualquer aula: lista de alunos presentes com valores, total, peso total, valor por peso e pagamento de cada professor.

**Exportação / Importação**
Backup completo em `.json` para migração entre dispositivos ou compartilhamento. Importação restaura todos os dados com validação do formato.

**Compartilhamento de fechamento**
Gera texto formatado (emoji-friendly para WhatsApp) com resumo do mês: aulas realizadas, presenças, total arrecadado, pagamento por professor e lista de aulas. Usa `navigator.share` nativo no celular; botão "Copiar" no desktop.

---

## Lógica de Divisão Financeira

A ideia central é simples: **o dinheiro arrecadado numa aula é dividido proporcionalmente ao peso de cada professor presente**.

---

**Passo 1 — Total arrecadado**

Some tudo que os alunos presentes pagaram naquela aula.

> 6 alunos × R$ 15 + 1 aluno × R$ 20 = **R$ 110**

---

**Passo 2 — Soma dos pesos**

Cada professor tem um peso que representa sua responsabilidade/nível naquela aula. Os pesos padrão são:

| Nível | Peso |
|---|---|
| Principal | 2 |
| Professor | 1,5 |
| Auxiliar | 1 |
| Trainee | 0,5 |
| Observador | 0 |

Se numa aula estão presentes um Principal (2), um Auxiliar (1) e um Trainee (0,5), a soma é **3,5**.

O peso é salvo **no momento do registro da aula**, então se o professor mudar de nível depois, as aulas antigas não são afetadas.

---

**Passo 3 — Valor por peso (a "unidade de medida")**

Divide o total arrecadado pela soma dos pesos. Isso dá o valor que corresponde a 1 unidade de peso.

> R$ 110 ÷ 3,5 = **R$ 31,43 por peso**

---

**Passo 4 — Pagamento de cada professor**

Multiplica o peso individual de cada professor pelo valor por peso.

| Professor | Peso | Cálculo | Recebe |
|---|---|---|---|
| Principal | 2 | 2 × R$ 31,43 | **R$ 62,86** |
| Auxiliar | 1 | 1 × R$ 31,43 | **R$ 31,43** |
| Trainee | 0,5 | 0,5 × R$ 31,43 | **R$ 15,71** |
| **Total** | **3,5** | | **R$ 110,00** ✓ |

O total dos pagamentos sempre fecha exatamente igual ao total arrecadado — nenhum centavo se perde.

---

**Por que esse modelo funciona bem**

O peso não é um percentual fixo, é uma **razão relativa**. Isso significa que se o Principal der uma aula sozinho, ele fica com 100% do valor — independente do peso ser 2. O peso só importa em relação aos outros presentes. Quanto mais pessoas na aula, mais o bolo se divide; quanto maior o peso relativo de alguém, maior a fatia.

Um trainee com peso 0 participa da aula mas não retira nada do valor — útil para período de observação sem impactar a remuneração dos professores efetivos.

---

**O que fica para a Fase 2** do roadmap: controle de inadimplência, histórico individual do aluno, exportação em PDF/Excel, relatórios avançados, múltiplos usuários com permissões e sincronização em nuvem (Supabase/Firebase).
# CI — Unidade II · Escrituração Contábil

Módulo da Unidade II (Operações com Mercadorias e Operações Financeiras) da plataforma **CI - Contabilidade Intermediária**, CEDUP Hermann Hering. React + Firebase (Auth, Firestore, Hosting), seguindo o mesmo padrão técnico dos demais projetos da escola.

Este repositório nasce **isolado** (branch/projeto à parte) e é pensado para depois ser incorporado ao repositório principal do CI, uma vez validado — não é uma substituição do projeto CI existente.

## Origem

Todo o comportamento aqui foi primeiro validado como protótipo navegável (React + estado local, sem backend) diretamente na conversa com o professor. O protótipo final está preservado como referência de UI e fluxo em `prototipo-referencia/index.html` — qualquer dúvida sobre como uma tela deveria se comportar, ela está lá, funcionando com dados fictícios.

## Setup

```bash
npm install
cp .env.example .env        # preencha com as credenciais do Console Firebase
cp .firebaserc.example .firebaserc   # troque pelo project id de verdade
npm run dev
```

Scripts:
- `npm run dev` — ambiente local (Vite)
- `npm run build` — build de produção em `dist/`
- `npm run deploy` — build + `firebase deploy --only hosting`

## Estrutura

```
src/
  firebase.js                    → inicialização (Auth, Firestore)
  App.jsx                        → fluxo de autenticação (login → confirmar matrícula → app)
  lib/
    contabil.js                  → motor contábil (Diário→Razão→Balancete→DRE→BP) — portado e testado
  data/
    planoContasOficial.js        → as 202 contas oficiais do CEDUP Hermann Hering
  components/
    layout/
      TelaAcesso.jsx              → tela de acesso institucional (aprovada — Opção 2)
      TelaConfirmarMatricula.jsx  → primeiro acesso do aluno
      Shell.jsx                   → sidebar + topbar + roteamento de telas
    aluno/, professor/            → onde entram as telas específicas de cada papel (ver checklist abaixo)
firestore.rules                  → regras de segurança
firebase.json, firestore.indexes.json, .firebaserc.example
```

## O que já está portado de verdade

- **Autenticação real** (Google, via Firebase Auth) substituindo o botão de "login demonstrativo" do protótipo.
- **Confirmação de matrícula** no primeiro acesso — tela nova, busca a matrícula com um `collectionGroup` no Firestore e vincula o `uid` automaticamente.
- **Motor contábil** (`src/lib/contabil.js`) — mesmas funções do protótipo (`calcularRazao`, `calcularDRE`, `calcularBP`...), só trocando de onde vêm os dados (Firestore em vez de `useState`).
- **Plano de Contas oficial** (`src/data/planoContasOficial.js`) — as 202 contas, prontas para popular a coleção `planoContas` (script de seed ainda a escrever, ou upload manual pelo Console).
- **Regras de segurança** (`firestore.rules`) — cobrem todas as coleções do modelo de dados, incluindo `analisesFiscais` (ver nota abaixo). Ainda não testadas contra o emulador (veja "Antes de ir para produção").
- **Hooks compartilhados** (`src/hooks/`): `useEscrituracao`, `usePlanoContas`, `useDocumentosDaTurma`, `useTurmasDoProfessor`, `useAlunosDaTurma`, `useLancamentosDaTurma`, `useCatalogoDocumentos`.
- **Lado do aluno: completo** — as 13 telas, ligadas ao Firestore de ponta a ponta.
- **Lado do professor: completo** — Painel (com Avaliação embutida: nota, prazo, desconto de pontualidade automático — mesma fórmula do protótipo, penalidade fixa no 1º dia + valor por dia adicional), Turmas (criar turma, cadastrar aluno, **importar lista de alunos via PDF** com a mesma extração testada contra o PDF real da escola), Fila de Correção (aprova/devolve, agregando todos os alunos da turma), Histórico do aluno, Documentos Fiscais (catálogo, **importar via ZIP**, liberar por turma), Plano de Contas.
- **PDF e ZIP como dependências reais do projeto** (`pdfjs-dist`, `jszip`) em vez do import dinâmico de CDN que o protótipo usava — mais robusto para build de produção; o worker do PDF.js é resolvido pelo Vite via `?url`.
- **Três problemas do protótipo corrigidos na portagem:**
  1. O drill-down da DRE ainda filtrava por `conta.grupo.includes(...)` — resquício de quando `grupo` era string; quebraria em runtime desde a migração para o Plano de Contas oficial (numérico). Corrigido em `src/components/aluno/DRE.jsx`.
  2. A tela de Análise Fiscal tinha todos os campos sem `value`/`onChange` e os botões sem `onClick` — nunca guardava nada. Virou formulário controlado de verdade, com uma subcoleção nova, `analisesFiscais` (documentada no modelo de dados e coberta em `firestore.rules`).
  3. A regra de criação de `turmas` não conferia se o `professorId` gravado era o do próprio usuário — um professor poderia, em teoria, criar uma turma em nome de outro. Corrigido.

## O que falta

- Responsividade mobile — ainda não trabalhada.
- Testar `firestore.rules` contra o emulador antes do primeiro deploy real (ver "Antes de ir para produção").

## Cloud Functions (`functions/`)

Duas funções, cobrindo as duas peças que dependiam de capacidades do Claude.ai (que não existem fora dele):

1. **`criarPerfilNoPrimeiroLogin`** — trigger de Auth (v1) que cria `users/{uid}` assim que alguém loga pela primeira vez. **Bloqueante**: sem ela implantada, o login trava em "Preparando seu acesso…", como o próprio `App.jsx` avisa em comentário. Decide o papel consultando `professoresAutorizados/{email}` (cadastrado manualmente no Console — Firestore → nova coleção `professoresAutorizados` → documento com id = e-mail institucional em minúsculas, campo `papel`: `professor` ou `admin`); quem não estiver lá entra como aluno.
2. **`analisarLancamento`** — Cloud Function HTTPS callable que substitui a capacidade `sample` do protótipo, chamando a API da Anthropic com uma chave própria da escola. Só professores podem chamar (conferido no próprio `users/{uid}.papel`, nunca no que o cliente alega). Antes de implantar, configure o secret:
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
   E confira em [docs.anthropic.com](https://docs.anthropic.com) se `MODELO_CLAUDE` (topo do arquivo) ainda é o nome de modelo vigente — nomes mudam com o tempo.

Deploy: `firebase deploy --only functions` (exige o plano Blaze — ver o guia do Console Firebase, seção 5).

## Backup

Diferente do protótipo (que usava a capacidade `downloads`, exclusiva do runtime do Claude.ai), aqui é só um `Blob` + link de download comum (`src/lib/backup.js`) — sem Cloud Function nenhuma. Escopado por usuário, como ficou decidido: o aluno baixa só os próprios dados (lançamentos, digitações, classificações, análises fiscais); o professor baixa a turma selecionada inteira (todos os alunos + lançamentos de cada um).

## Antes de ir para produção

- [ ] Rodar `firestore.rules` contra o **Firebase Emulator Suite** (`firebase emulators:start`) antes do primeiro deploy — elas não foram testadas contra o emulador real nesta preparação, só revisadas manualmente linha por linha.
- [ ] O `collectionGroup` query de `TelaConfirmarMatricula.jsx` provavelmente vai pedir a criação de um índice na primeira execução em produção — o próprio erro do Firestore no console do navegador traz um link direto para criá-lo. É normal, não é bug.
- [ ] Implantar as Cloud Functions (`firebase deploy --only functions`) — sem `criarPerfilNoPrimeiroLogin` em produção, ninguém consegue logar de verdade. Exige o plano Blaze.
- [ ] Cadastrar ao menos um professor em `professoresAutorizados` **antes** do primeiro login real de um professor — senão ele entra como aluno.
- [ ] Configurar o secret `ANTHROPIC_API_KEY` (`firebase functions:secrets:set`) se forem usar a análise por IA.
- [ ] Popular a coleção `planoContas` com o conteúdo de `src/data/planoContasOficial.js` (script de seed ou upload manual).

## Responsividade

A sidebar vira um menu off-canvas (☰) abaixo de 860px de largura, com fundo escurecido atrás; tabelas ganham rolagem horizontal em vez de espremer colunas; grids de 2 colunas colapsam para 1; KPIs reorganizam de 4 para 2 colunas. Ainda não testado num aparelho real — só via DevTools — antes de considerar isso pronto, vale abrir num celular de verdade e navegar pelo menos o fluxo do Livro Diário (é o mais denso em campos).

## Documento de referência

O modelo de dados completo (todas as coleções, campos e a tabela de quem pode ler/escrever o quê) está em: https://claude.ai/artifact/Ryq7RZVvSBUzKToDXuszWp

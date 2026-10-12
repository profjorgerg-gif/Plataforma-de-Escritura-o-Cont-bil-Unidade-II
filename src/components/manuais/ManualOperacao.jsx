export default function ManualOperacao() {
  return (
    <>
      <div className="screen-eyebrow">manual · restrito ao admin</div>
      <h2 className="screen-title">Manual de Operacionalização</h2>
      <p className="screen-sub">Como o sistema é construído e mantido por trás das telas, no Projeto Interdisciplinar CI–CA–AGB (6 etapas).</p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>1. Objetivo pedagógico</h3></div>
        <div className="panel-body">
          <p>O sistema não substitui o ensino de teoria contábil — ele existe para fechar a lacuna entre saber a regra e saber aplicá-la num caso real, do início ao fim, que é justamente onde a maioria dos alunos trava na Contabilidade Intermediária.</p>
          <p><b>Objetivo central:</b> levar o aluno a percorrer sozinho, com autonomia crescente, o ciclo contábil completo de um documento fiscal real (NF-e) — da leitura do documento até a demonstração financeira que ele gera — em vez de resolver exercícios já pré-mastigados (lançamento pronto para só classificar, ou balancete já fechado para só montar a DRE).</p>
          <p>Isso se desdobra em objetivos específicos, cada um mapeado a uma etapa da plataforma:</p>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Leitura e interpretação de documento fiscal real</b> — ao digitar e depois julgar CFOP/NCM/CST de uma NF-e (sem gabarito visível), o aluno pratica extrair e questionar informação fiscal de um documento de verdade, não de um enunciado já simplificado.</li>
            <li><b>Julgamento contábil, não memorização de fórmula</b> — na Classificação Contábil, o sistema não sugere qual conta usar. O aluno precisa identificar o fato gerador e argumentar sua escolha; o erro faz parte do exercício, não é motivo de bloqueio.</li>
            <li><b>Rigor técnico do lançamento</b> — o Livro Diário só libera o envio com Débito = Crédito, e traz avisos pedagógicos (natureza da conta, regime de competência) que apontam problemas sem corrigir por ele.</li>
            <li><b>Ciclo de correção como parte do aprendizado</b> — quando o professor devolve um lançamento, o aluno reformula e reenvia quantas vezes for preciso. Na rubrica de avaliação, autonomia (quantas rodadas até acertar) pesa só 20%, para não punir pesadamente quem erra e aprende corrigindo.</li>
            <li><b>Visão sistêmica do ciclo contábil</b> — Razão, Balancete, ARE, DRE e Balanço Patrimonial são gerados automaticamente a partir dos lançamentos aprovados, mostrando ao aluno como uma decisão de classificação se propaga até o resultado final.</li>
            <li><b>Progressão com feedback formativo contínuo</b> — "Meu progresso" dá visibilidade constante do avanço por documento, e a nota final (completude 45% + qualidade técnica 35% + autonomia 20%) recompensa tanto a conclusão do ciclo quanto a qualidade do raciocínio.</li>
          </ul>
          <p>Em resumo: a plataforma transforma a etapa 1 de uma sequência de exercícios avaliados isoladamente numa simulação de escrituração contábil real, com responsabilidade e consequência encadeada, onde o aluno pratica o mesmo fluxo de decisão que vai usar profissionalmente.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. Arquitetura</h3></div>
        <div className="panel-body">
          <p>React (Vite) + Firebase: <b>Authentication</b> (login Google), <b>Firestore</b> (banco de dados), <b>Hosting</b> (publicação do site). O código-fonte vive num repositório GitHub; toda mudança enviada à branch <code className="mono">main</code> dispara um <b>GitHub Actions</b> que builda e publica sozinho — não é necessário Node nem Firebase CLI instalados localmente.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>3. Publicando uma mudança</h3></div>
        <div className="panel-body">
          <p>Edite o arquivo direto no site do GitHub (ícone de lápis) ou envie os arquivos atualizados por upload, e faça o commit. Acompanhe em <b>Actions</b> — leva cerca de 2 minutos até o site atualizar.</p>
          <p>Regras de segurança (<code className="mono">firestore.rules</code>) são um caso à parte: salvar no GitHub não é suficiente — é preciso também colar e publicar o mesmo conteúdo direto no Console Firebase (Firestore → Regras → Publish).</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>4. Papéis de usuário</h3></div>
        <div className="panel-body">
          <p>Todo mundo que loga pela primeira vez entra automaticamente como <b>aluno</b> — é a regra de segurança que garante isso, ninguém consegue se autopromover. Para tornar alguém <b>professor</b> ou <b>admin</b>: Console Firebase → Firestore → coleção <code className="mono">users</code> → encontre o documento da pessoa (pelo campo <code className="mono">email</code>) → troque o campo <code className="mono">papel</code> manualmente.</p>
          <p>Só o papel <code className="mono">admin</code> vê este manual e os outros dois ao mesmo tempo.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>5. Plano de contas</h3></div>
        <div className="panel-body">
          <p>Enquanto a coleção <code className="mono">planoContas</code> estiver vazia no Firestore, o sistema usa uma lista de reserva fixa no próprio código (<code className="mono">src/data/planoContasOficial.js</code>), com as mesmas ~200 contas oficiais. Popular a coleção de verdade (por script ou manualmente) permite que o professor crie contas novas pela tela, que passam a valer para todo mundo.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>6. Limitações conhecidas</h3></div>
        <div className="panel-body">
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>Não há Cloud Functions em produção (para evitar o plano pago Blaze) — a criação de perfil no primeiro login acontece no próprio app, protegida por regra de segurança. A análise de lançamento por IA também não depende de Cloud Function: o professor monta e copia um prompt (botão "📋 Copiar prompt para IA" na Fila de Correção) e cola manualmente no Claude.ai ou no ChatGPT — zero custo, zero chave de API guardada no sistema.</li>
            <li>Backup é manual: cada usuário baixa os próprios dados em <code className="mono">.json</code> pelo botão "Baixar backup" — não há rotina automática.</li>
            <li>O app foi desenhado para computador; funciona em celular, mas não foi testado exaustivamente nesse formato.</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>7. Menus e telas iniciais (Planejamento, Organização, Direção e Controle)</h3></div>
        <div className="panel-body">
          <p>Os menus do aluno e do professor são definidos em um único arquivo, <code className="mono">src/lib/menuPodc.js</code>, que apenas descreve o menu: não lê nem grava no Firestore. As chaves das telas (<code className="mono">key</code>) não mudam, e por isso nada do que os alunos já digitaram é afetado por mudanças de menu.</p>
          <p>O cronograma (<code className="mono">shared/Cronograma.jsx</code> e <code className="mono">lib/cronograma.js</code>) também só lê: usa os prazos de “Etapas e prazos” e desenha um SVG único, que serve para a tela, para o PDF (impressão em A4 paisagem) e para o PNG (canvas do navegador, sem biblioteca). O andamento da turma só é lido (uma leitura por aluno) quando o professor clica no botão. As telas “Comece aqui” (<code className="mono">InicioAluno.jsx</code> e <code className="mono">InicioProfessor.jsx</code>), a faixa “Etapa X de 6” e a tela de etapa bloqueada são só de leitura. O botão “← Voltar” usa uma pilha de telas guardada só na memória do navegador (últimas 30 telas).</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>8. Etapas e liberação</h3></div>
        <div className="panel-body">
          <p>As 6 etapas têm identificadores fixos: <code className="mono">f1</code> (Escrituração), <code className="mono">fp</code> (Folha de pagamento), <code className="mono">ca</code>, <code className="mono">resc</code>, <code className="mono">agb</code> e <code className="mono">comp</code>. A etapa fica disponível ao aluno conforme a liberação da turma: <code className="mono">f1</code> sempre; <code className="mono">fp</code> com o CA liberado e a atividade da folha liberada; <code className="mono">ca</code> com o CA liberado; <code className="mono">resc</code> com a rescisão liberada; <code className="mono">agb</code> com o AGB liberado; <code className="mono">comp</code> com o AGB e os exercícios comparativos liberados.</p>
          <p>A situação (Entregue, Ajustar, Aprovada etc.) vem do roteiro do aluno, e a nota de 0 a 10 de cada etapa fica na coleção de avaliações. A etapa bloqueada aparece no menu, mas a tela real não abre. Os identificadores internos não mudaram com a padronização dos nomes das etapas.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>9. Regras do Firestore: arquivo espelho</h3></div>
        <div className="panel-body">
          <p>O arquivo <code className="mono">firestore.rules</code> do repositório é um <b>espelho</b> das regras publicadas no Console Firebase. Quem vale é o que está publicado no Console (Firestore → Regras). Quando as regras mudarem, atualize os dois: cole no Console e publique, e depois salve o mesmo conteúdo no repositório.</p>
          <p>Como o deploy automático publica só o Hosting, enviar o arquivo ao GitHub <b>não</b> altera as regras em produção.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>10. Modo de teste e roteiro de testes</h3></div>
        <div className="panel-body">
          <p>O modo de teste é exclusivo de professor e admin: a plataforma só ativa quando o papel do usuário permite. O “🧪 Roteiro de testes” (<code className="mono">RoteiroTestes.jsx</code>, com os passos em <code className="mono">lib/roteiroTestes.js</code>) também só aparece para eles. O progresso dos passos fica no <code className="mono">localStorage</code> do navegador, por professor e turma (<code className="mono">roteiroTestes_v1_&lt;uid&gt;_&lt;turma&gt;</code>), sem Firestore.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>11. Atualizações em ZIP</h3></div>
        <div className="panel-body">
          <p>Cada atualização chega num ZIP cumulativo, que substitui o anterior. Para aplicar: (1) use “Baixar backup”; (2) suba a pasta <code className="mono">src</code> em um único commit; (3) suba os arquivos da raiz (<code className="mono">index.html</code>, <code className="mono">README.md</code> e, quando vier, <code className="mono">firestore.rules</code>); (4) depois do deploy, confira a tela alterada com a conta de teste; (5) confira o total de arquivos do ZIP no GitHub.</p>
        </div>
      </div>

      <div className="helper-note">O modelo de dados completo (coleções, campos, regras) está documentado à parte — peça o link de referência a quem acompanhou a configuração inicial do projeto.</div>
    </>
  );
}

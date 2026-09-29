export default function ManualOperacao() {
  return (
    <>
      <div className="screen-eyebrow">manual · restrito ao admin</div>
      <h2 className="screen-title">Manual de Operacionalização</h2>
      <p className="screen-sub">Como o sistema é construído e mantido por trás das telas.</p>
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
          <p>Em resumo: a plataforma transforma a Unidade II de uma sequência de exercícios avaliados isoladamente numa simulação de escrituração contábil real, com responsabilidade e consequência encadeada, onde o aluno pratica o mesmo fluxo de decisão que vai usar profissionalmente.</p>
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

      <div className="helper-note">O modelo de dados completo (coleções, campos, regras) está documentado à parte — peça o link de referência a quem acompanhou a configuração inicial do projeto.</div>
    </>
  );
}

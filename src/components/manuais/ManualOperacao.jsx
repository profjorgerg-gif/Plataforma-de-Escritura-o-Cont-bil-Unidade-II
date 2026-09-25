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
        <div className="panel-head"><h3>1. Arquitetura</h3></div>
        <div className="panel-body">
          <p>React (Vite) + Firebase: <b>Authentication</b> (login Google), <b>Firestore</b> (banco de dados), <b>Hosting</b> (publicação do site). O código-fonte vive num repositório GitHub; toda mudança enviada à branch <code className="mono">main</code> dispara um <b>GitHub Actions</b> que builda e publica sozinho — não é necessário Node nem Firebase CLI instalados localmente.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. Publicando uma mudança</h3></div>
        <div className="panel-body">
          <p>Edite o arquivo direto no site do GitHub (ícone de lápis) ou envie os arquivos atualizados por upload, e faça o commit. Acompanhe em <b>Actions</b> — leva cerca de 2 minutos até o site atualizar.</p>
          <p>Regras de segurança (<code className="mono">firestore.rules</code>) são um caso à parte: salvar no GitHub não é suficiente — é preciso também colar e publicar o mesmo conteúdo direto no Console Firebase (Firestore → Regras → Publish).</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>3. Papéis de usuário</h3></div>
        <div className="panel-body">
          <p>Todo mundo que loga pela primeira vez entra automaticamente como <b>aluno</b> — é a regra de segurança que garante isso, ninguém consegue se autopromover. Para tornar alguém <b>professor</b> ou <b>admin</b>: Console Firebase → Firestore → coleção <code className="mono">users</code> → encontre o documento da pessoa (pelo campo <code className="mono">email</code>) → troque o campo <code className="mono">papel</code> manualmente.</p>
          <p>Só o papel <code className="mono">admin</code> vê este manual e os outros dois ao mesmo tempo.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>4. Plano de contas</h3></div>
        <div className="panel-body">
          <p>Enquanto a coleção <code className="mono">planoContas</code> estiver vazia no Firestore, o sistema usa uma lista de reserva fixa no próprio código (<code className="mono">src/data/planoContasOficial.js</code>), com as mesmas ~200 contas oficiais. Popular a coleção de verdade (por script ou manualmente) permite que o professor crie contas novas pela tela, que passam a valer para todo mundo.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>5. Limitações conhecidas</h3></div>
        <div className="panel-body">
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li>Não há Cloud Functions em produção (para evitar o plano pago Blaze) — a criação de perfil no primeiro login acontece no próprio app, protegida por regra de segurança, e a análise de lançamento por IA ainda não tem uma versão sem custo implementada.</li>
            <li>Backup é manual: cada usuário baixa os próprios dados em <code className="mono">.json</code> pelo botão "Baixar backup" — não há rotina automática.</li>
            <li>O app foi desenhado para computador; funciona em celular, mas não foi testado exaustivamente nesse formato.</li>
          </ul>
        </div>
      </div>

      <div className="helper-note">O modelo de dados completo (coleções, campos, regras) está documentado à parte — peça o link de referência a quem acompanhou a configuração inicial do projeto.</div>
    </>
  );
}

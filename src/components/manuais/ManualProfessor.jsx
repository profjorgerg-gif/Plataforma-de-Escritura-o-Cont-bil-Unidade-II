export default function ManualProfessor() {
  return (
    <>
      <div className="screen-eyebrow">manual</div>
      <h2 className="screen-title">Manual do Professor</h2>
      <p className="screen-sub">Como conduzir a Unidade II pela plataforma.</p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>1. Turmas e alunos</h3></div>
        <div className="panel-body">
          <p>Em <b>Turmas</b>, crie a turma e cadastre os alunos — nome + matrícula, um por um, ou de uma vez importando um <b>PDF</b> com a lista (o sistema tenta reconhecer nome e matrícula automaticamente; sempre revise antes de confirmar).</p>
          <p>É essa matrícula que cada aluno vai digitar no primeiro login — sem ela cadastrada aqui antes, o aluno não consegue confirmar acesso.</p>
          <p>Ainda em Turmas, defina o <b>prazo da Unidade II</b> e a política de desconto por atraso (penalidade no 1º dia + valor por dia adicional) — isso alimenta o cálculo automático que aparece depois em Avaliação.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. Documentos fiscais</h3></div>
        <div className="panel-body">
          <p>Em <b>Documentos fiscais</b>, cadastre cada NF-e didática (número, itens, impostos, totais) — isso vira o "gabarito" contra o qual a digitação do aluno é conferida. Dá para cadastrar um por vez ou importar vários de uma vez via <b>ZIP de PDFs</b> (os arquivos entram como rascunho, aguardando você completar os dados).</p>
          <p>Um documento só aparece para os alunos depois de você clicar em <b>liberar para a turma</b> — o catálogo é compartilhado entre turmas, mas a liberação é por turma.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>3. Plano de contas</h3></div>
        <div className="panel-body">
          <p>A lista de contas é institucional (vale para todas as turmas). Use a busca para achar rápido, e <b>+ Nova conta</b> se faltar alguma — natureza e demonstração (BP/DRE/ARE) são sugeridas automaticamente pelo grupo escolhido.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>4. Corrigindo lançamentos</h3></div>
        <div className="panel-body">
          <p>Em <b>Fila de correção</b> aparecem todos os lançamentos enviados por qualquer aluno da turma, com o nome de quem enviou. Compare com o documento de origem e clique <b>Aprovar</b> ou <b>Devolver para correção</b> (escreva uma observação — é isso que o aluno vê).</p>
          <p>Só lançamentos aprovados entram no Razão, Balancete e demonstrações do aluno.</p>
          <p><b>Histórico do aluno</b> mostra tudo o que aquele aluno já lançou, aprovado ou não — clique num aluno na tela de Turmas para abrir o histórico dele.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>5. Avaliação</h3></div>
        <div className="panel-body">
          <p>A nota da Unidade II é <b>única por aluno</b> — não é uma média de lançamentos. Você atribui a nota bruta olhando o conjunto do trabalho (Painel do Professor → Avaliação). O desconto por atraso é calculado sozinho a partir da política definida em Turmas, mas você pode sempre sobrescrever.</p>
          <p>A nota só aparece para o aluno depois que você clicar em <b>liberar</b>. Prorrogações individuais de prazo (para um aluno específico) também ficam nessa tela, com histórico preservado.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>6. Testar como aluno</h3></div>
        <div className="panel-body">
          <p>Em <b>Modo de teste</b>, crie uma conta de teste e clique em "Entrar no modo de teste" para navegar pelas telas do aluno com seu próprio login — sem precisar de uma segunda conta Google. Um aviso fica visível o tempo todo enquanto você está nesse modo, e um botão leva de volta ao Painel a qualquer momento. Essa conta nunca se mistura com dados de alunos reais.</p>
        </div>
      </div>
    </>
  );
}

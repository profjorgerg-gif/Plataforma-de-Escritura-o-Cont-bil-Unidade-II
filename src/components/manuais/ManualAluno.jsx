export default function ManualAluno() {
  return (
    <>
      <div className="screen-eyebrow">manual</div>
      <h2 className="screen-title">Manual do Aluno</h2>
      <p className="screen-sub">Como usar a plataforma de Escrituração Contábil — Unidade II.</p>

      <div className="panel">
        <div className="panel-head"><h3>1. Entrando no sistema</h3></div>
        <div className="panel-body">
          <p>Acesse o site com sua conta Google institucional e clique em <b>Continuar com Google</b>.</p>
          <p>No <b>primeiro acesso</b>, o sistema pede a matrícula que o professor informou. Digite exatamente esse número e confirme — sua <b>empresa didática</b> é criada automaticamente nesse momento. Nos acessos seguintes, você entra direto.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. O fluxo do exercício</h3></div>
        <div className="panel-body">
          <p>Cada nota fiscal que o professor liberar percorre este caminho, nesta ordem — pule uma etapa e a próxima não vai fazer muito sentido:</p>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Documentos fiscais</b> — veja quais notas foram liberadas para a sua turma.</li>
            <li><b>Digitação da NF-e</b> — digite os dados da nota exatamente como estão no PDF do professor (número, itens, impostos, totais). Use "Conferir digitação" para checar se os valores batem antes de salvar.</li>
            <li><b>Análise fiscal</b> — julgue se o CFOP, o NCM e o CST informados na nota estão corretos para aquela operação, e justifique. O sistema não te diz a resposta certa.</li>
            <li><b>Plano de contas</b> — consulte as contas disponíveis (não há sugestão automática de qual usar).</li>
            <li><b>Classificação contábil</b> — identifique o fato contábil e escolha a conta a debitar e a creditar, antes de formalizar o lançamento.</li>
            <li><b>Livro diário</b> — registre o lançamento de verdade. O sistema só deixa enviar para correção se Débito = Crédito.</li>
          </ol>
          <p style={{ marginTop: 10 }}>A partir daí, <b>Livro Razão, Balancete, ARE, DRE e Balanço Patrimonial</b> são calculados automaticamente — só a partir dos lançamentos já <b>aprovados</b> pelo professor. Na DRE e no Balanço, clique numa linha para ver quais lançamentos formaram aquele valor.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>3. Status de um lançamento</h3></div>
        <div className="panel-body">
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Rascunho</b> — só você vê; ainda não foi enviado para o professor.</li>
            <li><b>Enviado p/ análise</b> — aguardando o professor revisar.</li>
            <li><b>Aprovado</b> — passa a valer no Razão, Balancete e demonstrações. Não pode mais ser editado.</li>
            <li><b>Correção necessária</b> — o professor devolveu com uma observação. Ajuste e envie de novo.</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>4. Acompanhando seu progresso</h3></div>
        <div className="panel-body">
          <p>Em <b>Meu progresso</b>, você vê quantos lançamentos estão aprovados, pendentes ou com correção, se seu Balanço já fecha, e a <b>nota da Unidade II</b> — que só aparece depois que o professor liberar.</p>
          <p>Ali também aparece o <b>prazo</b> definido pelo professor e o botão <b>Entregar atividade</b>, para marcar quando você considerar seu trabalho pronto.</p>
          <p>Se algum lançamento seu foi devolvido, a observação do professor fica visível na seção <b>Correções recebidas</b>, mesmo depois de você já ter corrigido e reenviado.</p>
        </div>
      </div>

      <div className="helper-note">Dúvidas sobre o conteúdo contábil em si (qual conta usar, se um CFOP está certo) são parte do exercício — o sistema não responde por você. Procure o professor.</div>
    </>
  );
}

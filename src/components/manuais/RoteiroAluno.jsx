// Roteiro do Aluno — Ciclo Contábil (Unidade II), disponível dentro do próprio
// sistema para consulta direta (antes só existia como um documento Word à
// parte). O conteúdo segue o roteiro oficial da disciplina; qualquer
// atualização de regras do sistema (ex.: a trava de Classificação) deve ser
// replicada aqui também.

function Secao({ titulo, children }) {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head"><h3>{titulo}</h3></div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

export default function RoteiroAluno() {
  return (
    <>
      <div className="screen-eyebrow">roteiro</div>
      <h2 className="screen-title">Roteiro do Aluno — Ciclo Contábil (Unidade II)</h2>
      <p className="screen-sub">
        Siga esta sequência, documento por documento, do início ao fim do ciclo contábil. O roteiro resume o que fazer
        em cada etapa — não substitui o Manual do Aluno, que mostra tela por tela.
      </p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <Secao titulo="Antes de começar, tenha em mãos">
        <ul>
          <li>Sua matrícula, exatamente como o professor informou.</li>
          <li>O PDF da NF-e do documento que você vai trabalhar.</li>
          <li>Acesso à sua conta Google institucional.</li>
        </ul>
      </Secao>

      <p>Cada "Passo" abaixo corresponde a uma tela do sistema. Complete-os nessa ordem para cada documento fiscal — algumas etapas só liberam depois que a anterior foi concluída.</p>

      <Secao titulo="Passo 1 — Entrar no sistema">
        <ol>
          <li>Acesse o site e clique em <b>Continuar com Google</b>, usando sua conta institucional.</li>
          <li>Confirme sua matrícula quando o sistema pedir — isso acontece a cada acesso, não só no primeiro.</li>
          <li>Você chega na tela <b>Meu progresso</b>, com os números gerais do seu ciclo contábil.</li>
          <li>Se precisar relembrar o funcionamento de alguma tela específica, consulte o Manual do Aluno.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 2 — Escolher um documento fiscal">
        <ol>
          <li>Abra <b>Documentos fiscais</b> no menu.</li>
          <li>Veja a lista de NF-e que o professor já liberou para a sua turma.</li>
          <li>Escolha o próximo documento ainda não concluído — siga a ordem numérica, salvo orientação diferente do professor.</li>
          <li>Tenha o PDF desse mesmo documento aberto, para conferir os dados ao digitar.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 3 — Digitar e analisar a NF-e">
        <ol>
          <li>Abra <b>Digitação e análise fiscal</b> e selecione o documento escolhido no Passo 2.</li>
          <li><b>Digitação:</b> transcreva os dados exatamente como aparecem no PDF — número, itens, impostos e totais.</li>
          <li>Use <b>Conferir digitação</b> para checar se os valores batem, e só então <b>Salvar digitação</b>.</li>
          <li><b>Análise fiscal:</b> na mesma tela, julgue se o CFOP, o NCM e o CST da nota estão corretos para a operação, justificando sua resposta.</li>
          <li>Clique em <b>Enviar análise</b> — salvar como rascunho não é suficiente para liberar as próximas etapas.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 4 — Classificar o fato contábil">
        <ol>
          <li>Abra <b>Classificação contábil</b> e selecione o documento de origem — só aparecem na lista os documentos em que você já enviou a análise fiscal (não basta ter salvado como rascunho).</li>
          <li>Descreva, com suas palavras, o fato contábil identificado (ex.: "compra de mercadorias a prazo").</li>
          <li>Escolha a conta a debitar e a conta a creditar, consultando o <b>Plano de contas</b> se precisar.</li>
          <li>Preencha o histórico e, se houver, o tratamento tributário.</li>
          <li>Salve a classificação — você vai usá-la no próximo passo.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 5 — Lançar no Livro Diário">
        <ol>
          <li>Na lista de classificações, clique em <b>usar no lançamento</b> para levar os dados prontos para o Diário.</li>
          <li>Ajuste a data e o histórico, se necessário.</li>
          <li>Confira se Débito = Crédito — o sistema não deixa enviar para análise se os valores não baterem.</li>
          <li>Escolha entre <b>salvar como rascunho</b> ou <b>enviar para análise do professor</b>.</li>
          <li>Aguarde a devolutiva: o lançamento fica "aguardando correção" até o professor aprovar ou pedir ajuste.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 6 — Repita para os próximos documentos">
        <p>Volte ao Passo 2 e repita toda a sequência para cada novo documento liberado pelo professor, até concluir o ciclo completo da sua empresa didática.</p>
      </Secao>

      <Secao titulo="Se o professor devolver um lançamento (correção)">
        <ol>
          <li>Em <b>Livro diário</b>, localize o lançamento marcado como "Correção necessária".</li>
          <li>Clique em <b>✏️ Editar</b> — a observação do professor aparece no topo, com os dados já preenchidos.</li>
          <li>Ajuste o que foi apontado e reenvie para análise.</li>
          <li>O ciclo se repete até o professor aprovar o lançamento.</li>
        </ol>
      </Secao>

      <Secao titulo="Conferindo o ciclo fechado">
        <p>Depois que seus lançamentos forem aprovados, acompanhe o resultado nos relatórios, nesta ordem:</p>
        <ul>
          <li><b>Livro razão</b> — movimento de cada conta, já somado.</li>
          <li><b>Balancete</b> — confirma se débitos e créditos batem no total.</li>
          <li><b>ARE</b> — apuração do resultado do período.</li>
          <li><b>DRE</b> — demonstração do resultado completa.</li>
          <li><b>Balanço patrimonial</b> — confirma se Ativo = Passivo + Patrimônio Líquido.</li>
        </ul>
        <p>Se algum desses relatórios não fechar, volte aos lançamentos e revise antes de seguir para o próximo documento.</p>
      </Secao>

      <Secao titulo="Acompanhando sua nota">
        <p>Depois que o professor liberar, o painel <b>Minha nota</b> aparece em "Meu progresso", combinando três indicadores:</p>
        <ul>
          <li><b>Completude do ciclo</b> (peso 45%) — quantos documentos você terminou do início ao fim, calculado automaticamente.</li>
          <li><b>Qualidade técnica</b> (peso 35%) — nota de 0 a 10 atribuída pelo professor ao seu raciocínio contábil.</li>
          <li><b>Autonomia</b> (peso 20%) — quanto menos rodadas de correção em média você precisou até ser aprovado, maior o valor.</li>
        </ul>
        <p>Se houver atraso em relação ao prazo da turma, um desconto é aplicado automaticamente na nota final, e aparece explicado junto do painel.</p>
      </Secao>

      <Secao titulo="Checklist rápido (por documento)">
        <ul>
          <li>Documento escolhido em Documentos fiscais</li>
          <li>Digitação preenchida e conferida</li>
          <li>Digitação salva</li>
          <li>Análise fiscal preenchida (CFOP, NCM, CST + justificativa)</li>
          <li>Análise fiscal enviada (não só rascunho)</li>
          <li>Fato contábil classificado (débito, crédito, histórico)</li>
          <li>Lançamento criado no Livro Diário</li>
          <li>Débito = Crédito conferido antes de enviar</li>
          <li>Lançamento enviado para análise do professor</li>
        </ul>
      </Secao>

      <div className="helper-note">Dúvidas sobre o conteúdo contábil em si (qual conta usar, se um CFOP está certo) são parte do exercício — o sistema não responde por você. Procure o professor.</div>
    </>
  );
}

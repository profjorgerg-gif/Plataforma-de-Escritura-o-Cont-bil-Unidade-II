// Roteiro do Aluno — Ciclo Contábil (Unidade II), disponível dentro do próprio
// sistema para consulta direta (antes só existia como um documento Word à
// parte). O conteúdo e as imagens seguem o roteiro oficial da disciplina;
// qualquer atualização de regras do sistema (ex.: a trava de Classificação)
// deve ser replicada aqui também.

function Secao({ titulo, children, imagem, imagem2 }) {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head"><h3>{titulo}</h3></div>
      <div className="panel-body">
        <div style={{ marginBottom: imagem ? 14 : 0 }}>{children}</div>
        {imagem && (
          <img
            src={`/manual/${imagem}`}
            alt={`Tela de "${titulo}" no sistema`}
            style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block", marginBottom: imagem2 ? 10 : 0 }}
          />
        )}
        {imagem2 && (
          <img
            src={`/manual/${imagem2}`}
            alt={`Tela de "${titulo}" no sistema (continuação)`}
            style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block" }}
          />
        )}
      </div>
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
          <li>Sua matrícula (a mesma que o professor cadastrou na turma).</li>
          <li>O PDF da NF-e que você vai trabalhar (disponibilizado pelo professor, fora do sistema).</li>
          <li>Acesso à sua conta Google.</li>
        </ul>
      </Secao>

      <Secao
        titulo="Como usar este roteiro"
        imagem="roteiro-aluno-01-meu-progresso.png"
      >
        <p>Repita os Passos 1 a 6 para cada documento fiscal liberado pelo professor. A tela <b>Meu progresso</b> (abaixo) é o ponto de referência: ela mostra quantos lançamentos você já tem aprovados, aguardando correção ou com correção necessária, e se o Balanço já fecha.</p>
      </Secao>

      <Secao titulo="Passo 1 — Entrar no sistema" imagem="roteiro-aluno-02-entrar-no-sistema.png">
        <ol>
          <li>Acesse o endereço do sistema informado pelo professor.</li>
          <li>Clique em <b>Continuar com Google</b> e entre com sua conta Google (sempre a mesma, do primeiro ao último acesso).</li>
          <li>Digite sua matrícula exatamente como o professor cadastrou. Isso acontece a cada login — é só uma confirmação, não um novo cadastro.</li>
          <li>Você cai em <b>Meu progresso</b>, a tela inicial. Confira ali quantos lançamentos já tem aprovados.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 2 — Escolher um documento fiscal" imagem="roteiro-aluno-03-documentos-fiscais.png">
        <ol>
          <li>No menu lateral, abra <b>Documentos fiscais</b>.</li>
          <li>Veja a lista de NF-e que o professor liberou para a sua turma (número, direção — entrada ou saída).</li>
          <li>Escolha um documento que ainda não tenha o ciclo completo (confira em Meu progresso, no checklist por documento).</li>
          <li>Abra o PDF correspondente que o professor disponibilizou fora do sistema — é dele que você vai digitar os dados.</li>
        </ol>
      </Secao>

      <Secao
        titulo="Passo 3 — Digitar e analisar a NF-e"
        imagem="roteiro-aluno-04-digitacao.png"
        imagem2="roteiro-aluno-05-analise-fiscal.png"
      >
        <ol>
          <li>Abra <b>Digitação e análise fiscal</b> e selecione o documento escolhido.</li>
          <li>Na parte <b>1. Digitação</b>, digite os dados exatamente como aparecem no PDF: número, série, natureza, itens, impostos e totais.</li>
          <li>Clique em <b>Conferir digitação</b> para checar se os totais batem com o gabarito do professor. Salve quando estiver correto.</li>
          <li>Na parte <b>2. Análise fiscal</b>, mais abaixo na mesma tela, julgue se o CFOP, o NCM e o CST do documento estão corretos para a operação.</li>
          <li>Se marcar algo como incorreto, informe o valor que você considera correto, justifique e clique em <b>Enviar análise</b> (salvar como rascunho não libera as próximas etapas).</li>
        </ol>
      </Secao>

      <Secao
        titulo="Passo 4 — Classificar o fato contábil"
        imagem="roteiro-aluno-06-plano-contas.png"
        imagem2="roteiro-aluno-07-classificacao.png"
      >
        <ol>
          <li>Se precisar, consulte o <b>Plano de contas</b> (busca por código, nome ou subgrupo) — ele não sugere a conta certa.</li>
          <li>Abra <b>Classificação contábil</b> e selecione o documento de origem — só aparecem na lista os documentos em que você já enviou a análise fiscal (não basta ter salvado como rascunho).</li>
          <li>Descreva o fato contábil identificado em suas palavras (ex.: "compra de mercadorias a prazo").</li>
          <li>Escolha a conta a debitar e a conta a creditar, e informe o valor.</li>
          <li>Salve a classificação. Clique em <b>usar no lançamento</b> para levar esses dados prontos direto para o Diário.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 5 — Lançar no Livro Diário" imagem="roteiro-aluno-08-livro-diario.png">
        <ol>
          <li>Abra <b>Livro diário</b>. Se você veio da Classificação clicando em "usar no lançamento", o formulário já vem preenchido.</li>
          <li>Confira ou preencha: data, histórico e as partidas de débito e crédito.</li>
          <li>Fique atento aos avisos pedagógicos que aparecem na tela (ex.: natureza da conta, regime de competência).</li>
          <li>O envio só é liberado quando Débito = Crédito. Corrija se aparecer diferença.</li>
          <li>Envie para análise do professor. O status muda para "Enviado p/ análise" até ele avaliar.</li>
        </ol>
      </Secao>

      <Secao titulo="Passo 6 — Repita para os próximos documentos">
        <p>Volte ao Passo 2 e repita os Passos 2 a 6 para cada documento fiscal liberado pela turma, até concluir o ciclo completo da sua empresa didática.</p>
      </Secao>

      <Secao titulo="Se o professor devolver um lançamento (correção)">
        <ol>
          <li>Em <b>Livro diário</b>, o lançamento aparece com o status "Correção necessária", em vermelho.</li>
          <li>Clique no botão <b>✏️ Editar</b> ao lado dele. A observação do professor aparece no topo do formulário.</li>
          <li>Ajuste o que foi apontado e reenvie.</li>
          <li>O ciclo se repete até o professor aprovar. Todo o histórico de correções fica registrado.</li>
        </ol>
      </Secao>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h3>Conferindo o ciclo fechado</h3></div>
        <div className="panel-body">
          <p>Depois que seus lançamentos forem aprovados, esses relatórios são gerados automaticamente, nesta ordem:</p>
          <ul>
            <li><b>Livro razão</b> — movimentos de cada conta, já somados a partir dos lançamentos aprovados.</li>
            <li><b>Balancete</b> — confirma se o total de débitos bate com o total de créditos de todas as contas.</li>
            <li><b>ARE</b> — apuração do resultado do exercício (receitas, deduções, custos e despesas).</li>
            <li><b>DRE</b> — demonstração do resultado completa; clique em qualquer linha para ver quais lançamentos a formaram.</li>
            <li><b>Balanço patrimonial</b> — Ativo, Passivo e Patrimônio Líquido. Uma mensagem confirma se Ativo = Passivo + PL.</li>
          </ul>
          <p style={{ marginBottom: 14 }}>Se algum desses não fechar, volte ao Livro diário e revise os lançamentos aprovados daquele documento.</p>
          <img src="/manual/roteiro-aluno-09-livro-razao.png" alt="Tela do Livro Razão" style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block", marginBottom: 10 }} />
          <img src="/manual/roteiro-aluno-10-balancete.png" alt="Tela do Balancete" style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block", marginBottom: 10 }} />
          <img src="/manual/roteiro-aluno-11-are.png" alt="Tela da ARE" style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block", marginBottom: 10 }} />
          <img src="/manual/roteiro-aluno-12-dre.png" alt="Tela da DRE" style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block", marginBottom: 10 }} />
          <img src="/manual/roteiro-aluno-13-balanco-patrimonial.png" alt="Tela do Balanço Patrimonial" style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block" }} />
        </div>
      </div>

      <Secao titulo="Acompanhando sua nota">
        <p>Depois que o professor liberar, o painel <b>Minha nota</b>, em "Meu progresso", mostra três indicadores:</p>
        <ul>
          <li><b>Completude do ciclo</b> (peso 45%) — quantos documentos você terminou do início ao fim, calculado automaticamente.</li>
          <li><b>Qualidade técnica</b> (peso 35%) — a nota de 0 a 10 que o professor atribui ao seu raciocínio contábil.</li>
          <li><b>Autonomia</b> (peso 20%) — quanto menos rodadas de correção em média você precisou até ser aprovado, maior o valor.</li>
        </ul>
        <p>Se houver desconto por atraso, ele já vem aplicado na nota final, e aparece explicado logo abaixo do painel.</p>
      </Secao>

      <Secao titulo="Checklist rápido (por documento)">
        <ul>
          <li>☐ 1. Entrei no sistema e confirmei minha matrícula</li>
          <li>☐ 2. Escolhi um documento fiscal liberado e abri o PDF de referência</li>
          <li>☐ 3. Digitei a NF-e, conferi a digitação e fiz a análise fiscal (CFOP, NCM, CST) com justificativa</li>
          <li>☐ 4. Classifiquei o fato contábil (conta a debitar e a creditar)</li>
          <li>☐ 5. Lancei no Livro Diário com Débito = Crédito e enviei para análise</li>
          <li>☐ 6. Repeti os passos 2 a 6 para os demais documentos</li>
          <li>☐ 7. Corrigi e reenviei os lançamentos devolvidos, se houve algum</li>
          <li>☐ 8. Conferi Razão, Balancete, ARE, DRE e Balanço depois da aprovação</li>
          <li>☐ 9. Acompanhei minha nota em "Meu progresso"</li>
        </ul>
      </Secao>

      <div className="helper-note">Dúvidas sobre o conteúdo contábil em si (qual conta usar, se um CFOP está correto) são parte do exercício — o sistema não responde por você. Procure o professor.</div>
    </>
  );
}

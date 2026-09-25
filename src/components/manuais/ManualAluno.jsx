function Passo({ n, titulo, children, imagem }) {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head"><h3>{n}. {titulo}</h3></div>
      <div className="panel-body">
        <div style={{ marginBottom: 14 }}>{children}</div>
        <div style={{
          border: "1px dashed var(--line-strong)", borderRadius: 4, padding: "18px 16px",
          textAlign: "center", color: "var(--ink-faint)", background: "var(--paper-deep)",
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
          <div style={{ fontSize: 13 }}>Espaço para imagem desta etapa</div>
          <div className="mono" style={{ fontSize: 11.5, marginTop: 4 }}>arquivo sugerido: {imagem}</div>
        </div>
      </div>
    </div>
  );
}

export default function ManualAluno() {
  return (
    <>
      <div className="screen-eyebrow">manual</div>
      <h2 className="screen-title">Manual do Aluno</h2>
      <p className="screen-sub">
        Passo a passo de como usar a plataforma de Escrituração Contábil — Unidade II. Os quadros tracejados marcam onde uma
        captura de tela real deve entrar — use o nome de arquivo sugerido para manter tudo organizado.
      </p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <Passo n={1} titulo="Entrar no sistema" imagem="manual-aluno-01-login.png">
        <p>Acesse o site e clique em <b>Continuar com Google</b>. Use sua conta Google institucional.</p>
      </Passo>

      <Passo n={2} titulo="Confirmar a matrícula (só no primeiro acesso)" imagem="manual-aluno-02-confirmar-matricula.png">
        <p>Digite exatamente a matrícula que o professor informou. Sua <b>empresa didática</b> é criada automaticamente nesse momento. Nos próximos acessos essa tela não aparece mais.</p>
      </Passo>

      <Passo n={3} titulo="Meu progresso" imagem="manual-aluno-03-meu-progresso.png">
        <p>É a tela inicial. Mostra quantos lançamentos você tem aprovados, pendentes ou com correção, se o Balanço já fecha, o prazo da unidade e o botão <b>Entregar atividade</b>.</p>
      </Passo>

      <Passo n={4} titulo="Empresa didática" imagem="manual-aluno-04-empresa-didatica.png">
        <p>Consulta simples — mostra o nome da sua empresa fictícia, seu nome/matrícula e a turma.</p>
      </Passo>

      <Passo n={5} titulo="Documentos fiscais" imagem="manual-aluno-05-documentos-fiscais.png">
        <p>Lista as NF-e que o professor liberou para a sua turma. É o ponto de partida de cada exercício novo.</p>
      </Passo>

      <Passo n={6} titulo="Digitação da NF-e" imagem="manual-aluno-06-digitacao-nfe.png">
        <p>Escolha o documento e digite os dados exatamente como aparecem no PDF do professor: número, itens, impostos, totais. Use <b>Conferir digitação</b> para checar se os valores batem, e <b>Salvar digitação</b> para gravar.</p>
      </Passo>

      <Passo n={7} titulo="Análise fiscal" imagem="manual-aluno-07-analise-fiscal.png">
        <p>Julgue se o CFOP, o NCM e o CST da nota estão corretos para aquela operação, e justifique sua resposta. O sistema não indica a resposta certa — isso é parte do exercício.</p>
      </Passo>

      <Passo n={8} titulo="Plano de contas" imagem="manual-aluno-08-plano-contas.png">
        <p>Consulte as contas disponíveis por código, nome ou grupo. Use a busca para achar mais rápido.</p>
      </Passo>

      <Passo n={9} titulo="Classificação contábil" imagem="manual-aluno-09-classificacao-contabil.png">
        <p>Identifique o fato contábil e escolha a conta a debitar e a creditar antes de formalizar o lançamento no Diário.</p>
      </Passo>

      <Passo n={10} titulo="Livro diário" imagem="manual-aluno-10-livro-diario.png">
        <p>Registre o lançamento de verdade: data, histórico, contas e valores. O sistema só deixa enviar para análise quando Débito = Crédito. Escolha entre <b>salvar como rascunho</b> ou <b>enviar para análise do professor</b>.</p>
      </Passo>

      <Passo n={11} titulo="Livro razão" imagem="manual-aluno-11-livro-razao.png">
        <p>Mostra o histórico de movimentos de cada conta, já somado a partir dos lançamentos aprovados.</p>
      </Passo>

      <Passo n={12} titulo="Balancete" imagem="manual-aluno-12-balancete.png">
        <p>Confirma se o total de débitos bate com o total de créditos de todas as contas juntas.</p>
      </Passo>

      <Passo n={13} titulo="ARE — Apuração do Resultado" imagem="manual-aluno-13-are.png">
        <p>Mostra receitas, deduções, custos e despesas levando ao resultado do período.</p>
      </Passo>

      <Passo n={14} titulo="DRE" imagem="manual-aluno-14-dre.png">
        <p>A Demonstração do Resultado completa. Clique em qualquer linha para ver quais lançamentos formaram aquele valor.</p>
      </Passo>

      <Passo n={15} titulo="Balanço patrimonial" imagem="manual-aluno-15-balanco-patrimonial.png">
        <p>Ativo, Passivo e Patrimônio Líquido, calculados a partir dos mesmos lançamentos. Clique numa conta para rastrear a origem do saldo. Uma mensagem confirma se Ativo = Passivo + PL.</p>
      </Passo>

      <Passo n={16} titulo="Acompanhando correções e nota" imagem="manual-aluno-16-correcoes-nota.png">
        <p>Em "Meu progresso", a seção <b>Correções recebidas</b> mostra a observação do professor sempre que um lançamento seu foi devolvido. A <b>nota da Unidade II</b> só aparece depois que o professor liberar.</p>
      </Passo>

      <div className="helper-note">Dúvidas sobre o conteúdo contábil em si (qual conta usar, se um CFOP está certo) são parte do exercício — o sistema não responde por você. Procure o professor.</div>
    </>
  );
}

// Imagens reais já disponíveis em /public/manual — as demais etapas continuam
// mostrando o placeholder tracejado até que uma captura seja enviada.
const IMAGENS_DISPONIVEIS = new Set([
  "manual-aluno-03-meu-progresso.png",
  "manual-aluno-04-empresa-didatica.png",
  "manual-aluno-05-documentos-fiscais.png",
  "manual-aluno-06-digitacao-analise-fiscal.png",
  "manual-aluno-07-plano-contas.png",
  "manual-aluno-08-classificacao-contabil.png",
  "manual-aluno-09-livro-diario.png",
  "manual-aluno-10-livro-razao.png",
  "manual-aluno-11-balancete.png",
  "manual-aluno-12-are.png",
  "manual-aluno-13-dre.png",
  "manual-aluno-14-balanco-patrimonial.png",
]);

function Passo({ n, titulo, children, imagem }) {
  const temImagem = !!imagem && IMAGENS_DISPONIVEIS.has(imagem);
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head"><h3>{n}. {titulo}</h3></div>
      <div className="panel-body">
        <div style={{ marginBottom: 14 }}>{children}</div>
        {temImagem ? (
          <img
            src={`/manual/${imagem}`}
            alt={`Tela de "${titulo}" no sistema`}
            style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line-strong)", display: "block" }}
          />
        ) : !imagem ? null : (
          <div style={{
            border: "1px dashed var(--line-strong)", borderRadius: 4, padding: "18px 16px",
            textAlign: "center", color: "var(--ink-faint)", background: "var(--paper-deep)",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📷</div>
            <div style={{ fontSize: 13 }}>Espaço para imagem desta etapa</div>
            <div className="mono" style={{ fontSize: 11.5, marginTop: 4 }}>arquivo sugerido: {imagem}</div>
          </div>
        )}
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
        Passo a passo de como usar o Projeto Interdisciplinar CI–CA–AGB, nas 6 etapas: primeiro como se orientar na plataforma (A a E),
        depois a Etapa 1 · Escrituração (passos 1 a 15) e, por fim, as Etapas 2 a 6 (passos 16 a 20). Os quadros tracejados marcam onde uma
        captura de tela real deve entrar — use o nome de arquivo sugerido para manter tudo organizado.
      </p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <Passo n="A" titulo="Como o menu está organizado">
        <p>O menu da esquerda segue a ordem em que você trabalha, em quatro grupos: <b>P · Planejamento</b> (o que fazer e quando: “Meu roteiro por etapas”, “Roteiro do Aluno” e os manuais), <b>O · Organização</b> (o que você precisa para trabalhar: “Plano de contas” e “Consulta CFOP/NCM”), <b>D · Direção</b> (fazer as atividades, na ordem das 6 etapas) e <b>C · Controle</b> (“Meu progresso”, “Notas e retornos”, “Minha nota” e “Suporte”).</p>
        <p>No grupo Direção, cada etapa abre e fecha com um clique e mostra a sua situação: <b>Em andamento</b>, <b>Entregue</b>, <b>Ajustar</b>, <b>Aprovada</b> ou <b>Bloqueada</b>. A etapa em que você está fica destacada. Dentro da Etapa 1 os 10 passos aparecem numerados, na ordem em que devem ser feitos.</p>
      </Passo>

      <Passo n="B" titulo="Comece aqui e “Você está aqui”">
        <p>Ao entrar (depois de confirmar a matrícula), a primeira tela é o <b>🧭 Comece aqui</b>. Ela diz em que etapa você está, qual o prazo, qual a situação, e tem um botão que leva direto para a atividade. Mostra também as 6 etapas numa tabela, com disciplina (CI, CA ou AGB), prazo, número de aulas e situação.</p>
        <p>Em cada tela de uma etapa, no topo, uma linha mostra <b>Etapa X de 6</b>, o prazo e a situação. Assim você sempre sabe onde está.</p>
      </Passo>

      <Passo n="C" titulo="Etapas bloqueadas">
        <p>Cada etapa é liberada pelo professor depois de analisar a anterior. As etapas ainda não liberadas <b>não ficam escondidas</b>: aparecem no menu com a etiqueta “Bloqueada”, para você ver o caminho que ainda vem pela frente. Se abrir uma delas, a plataforma explica que ainda não foi liberada e mostra o prazo previsto e as atividades que a etapa terá. Quando o professor liberar, ela abre sozinha.</p>
      </Passo>

      <Passo n="D" titulo="Botão “← Voltar”">
        <p>Em todas as telas, exceto no “Comece aqui”, aparece no topo o botão <b>← Voltar</b>, com o nome da tela para a qual ele leva. Use-o para voltar à tela anterior sem precisar procurar de novo no menu. Ele funciona dentro da plataforma; o botão de voltar do navegador continua como sempre.</p>
      </Passo>

      <Passo n="E" titulo="Meu roteiro por etapas: entregar e acompanhar">
        <p>No grupo Planejamento, “Meu roteiro por etapas” mostra as 6 etapas, com prazo, situação e o botão <b>Entregar</b>. Quando terminar uma etapa, clique em Entregar: a situação passa a “Entregue” e o professor é avisado.</p>
        <p>Se o professor pedir ajustes, a etapa aparece como <b>Ajustar e reenviar</b>, com o retorno escrito dele. Corrija e entregue de novo (“Reenviada, aguardando análise”). Quando o professor aprovar, a etapa fica <b>Aprovada</b> e a próxima é liberada.</p>
        <p>Entregar depois do prazo desconta 2,0 pontos da nota da etapa. A Etapa 1 tem a sua própria regra de atraso (veja o passo 15). Há ainda a aba “Cópia para imprimir”.</p>
      </Passo>

      <Passo n={1} titulo="Entrar no sistema" imagem="manual-aluno-01-login.png">
        <p>Acesse o site e clique em <b>Continuar com Google</b>. Use sua conta Google institucional — é sempre a mesma conta que fica ligada à sua matrícula, do primeiro até o último acesso.</p>
      </Passo>

      <Passo n={2} titulo="Confirmar a matrícula (a cada acesso)" imagem="manual-aluno-02-confirmar-matricula.png">
        <p>No primeiro login, digite exatamente a matrícula que o professor informou — sua <b>empresa didática</b> é criada automaticamente nesse momento.</p>
        <p>Nos acessos seguintes, o sistema pede a matrícula de novo, toda vez que você entrar — é só uma confirmação rápida, não um novo cadastro, e serve para garantir que ninguém continue usando sua conta aberta num computador da escola.</p>
      </Passo>

      <Passo n={3} titulo="Meu progresso" imagem="manual-aluno-03-meu-progresso.png">
        <p>Fica no grupo Controle, e a Etapa 1 também a mostra no menu. Mostra quatro números: lançamentos <b>aprovados</b>, <b>aguardando correção</b>, <b>com correção necessária</b> e se o <b>Balanço já fecha</b>. Logo abaixo vem o resultado do exercício (parcial), o checklist de progresso por documento e, quando o professor liberar, o painel <b>Minha nota</b>.</p>
      </Passo>

      <Passo n={4} titulo="Empresa didática" imagem="manual-aluno-04-empresa-didatica.png">
        <p>Consulta simples — mostra o nome da sua empresa fictícia, seu nome/matrícula e a turma.</p>
      </Passo>

      <Passo n={5} titulo="Documentos fiscais" imagem="manual-aluno-05-documentos-fiscais.png">
        <p>Lista as NF-e que o professor liberou para a sua turma. É o ponto de partida de cada exercício novo.</p>
      </Passo>

      <Passo n={6} titulo="Digitação e análise fiscal" imagem="manual-aluno-06-digitacao-analise-fiscal.png">
        <p><b>1. Digitação:</b> escolha o documento e digite os dados exatamente como aparecem no PDF do professor: número, itens, impostos, totais. Use <b>Conferir digitação</b> para checar se os valores batem, e <b>Salvar digitação</b> para gravar.</p>
        <p><b>2. Análise fiscal:</b> logo abaixo, na mesma tela, julgue se o CFOP, o NCM e o CST da nota estão corretos para aquela operação, e justifique sua resposta. O sistema não indica a resposta certa em nenhuma das duas etapas — isso é parte do exercício. As duas etapas usam o mesmo documento, mas são registradas separadamente: a Análise não lê o que você digitou na Digitação, ela mostra sempre os dados cadastrados pelo professor.</p>
      </Passo>

      <Passo n={7} titulo="Plano de contas" imagem="manual-aluno-07-plano-contas.png">
        <p>Consulte as contas disponíveis por código, nome ou subgrupo. Use a busca para achar mais rápido.</p>
      </Passo>

      <Passo n={8} titulo="Classificação contábil" imagem="manual-aluno-08-classificacao-contabil.png">
        <p>Identifique o fato contábil e escolha a conta a debitar e a creditar antes de formalizar o lançamento no Diário.</p>
      </Passo>

      <Passo n={9} titulo="Livro diário" imagem="manual-aluno-09-livro-diario.png">
        <p>Registre o lançamento de verdade: data, histórico, contas e valores. O sistema só deixa enviar para análise quando Débito = Crédito. Escolha entre <b>salvar como rascunho</b> ou <b>enviar para análise do professor</b>.</p>
        <p>Se o professor devolver um lançamento (aparece como "Correção necessária", em vermelho), <b>clique no botão "✏️ Editar" ao lado dele na tabela</b> — a observação do professor aparece no topo do formulário, já com os dados preenchidos para você ajustar e reenviar. O ciclo se repete até o professor aprovar.</p>
      </Passo>

      <Passo n={10} titulo="Livro razão" imagem="manual-aluno-10-livro-razao.png">
        <p>Mostra o histórico de movimentos de cada conta, já somado a partir dos lançamentos aprovados.</p>
      </Passo>

      <Passo n={11} titulo="Balancete" imagem="manual-aluno-11-balancete.png">
        <p>Confirma se o total de débitos bate com o total de créditos de todas as contas juntas.</p>
      </Passo>

      <Passo n={12} titulo="ARE — Apuração do Resultado" imagem="manual-aluno-12-are.png">
        <p>Mostra receitas, deduções, custos e despesas levando ao resultado do período.</p>
      </Passo>

      <Passo n={13} titulo="DRE" imagem="manual-aluno-13-dre.png">
        <p>A Demonstração do Resultado completa. Clique em qualquer linha para ver quais lançamentos formaram aquele valor.</p>
      </Passo>

      <Passo n={14} titulo="Balanço patrimonial" imagem="manual-aluno-14-balanco-patrimonial.png">
        <p>Ativo, Passivo e Patrimônio Líquido, calculados a partir dos mesmos lançamentos. Clique numa conta para rastrear a origem do saldo. Uma mensagem confirma se Ativo = Passivo + PL.</p>
      </Passo>

      <Passo n={15} titulo="Acompanhando sua nota" imagem="manual-aluno-15-correcoes-nota.png">
        <p>Se o professor devolver um lançamento, a observação dele não aparece em "Meu progresso" — ela vem no próprio <b>Livro diário</b> (Passo 9), junto do lançamento marcado como "Correção necessária".</p>
        <p>Depois que o professor liberar, o painel <b>Minha nota</b> aparece em "Meu progresso" com quatro indicadores: <b>completude do ciclo</b> (peso 45%, em %, quantos documentos você terminou do início ao fim — calculado sozinho), <b>qualidade técnica</b> (peso 35%, é a nota de 0 a 10 que o professor atribuiu ao seu raciocínio contábil), <b>autonomia</b> (peso 20%, em %, quanto menos rodadas de correção em média você precisou até ser aprovado, maior o valor) e a <b>nota final</b>, de 0 a 10, que junta os três pesos. Se houver desconto por atraso, ele já vem aplicado na nota final, e aparece explicado abaixo do painel.</p>
      </Passo>

      <Passo n={16} titulo="Etapa 2 · Folha de pagamento (CA)">
        <p>O professor publica uma lista de empregados e você escolhe um por vez. Para cada um, preencha o contracheque inteiro: salário-base, adicionais, faltas, dependentes, filhos até 14 anos e vale-transporte, quando houver. A plataforma confere cada linha (INSS, IRRF, salário-família, descontos e líquido) e marca o nome do empregado com ✓ quando todas as linhas conferem.</p>
        <p>Há um mínimo de contracheques conferidos, definido pelo professor. Se ele ligar a trava, as telas da etapa 3 só abrem depois que ele aprovar esta atividade. Ao final, escreva o seu resumo em “Meu resumo sobre a folha” (o texto fica salvo) e entregue a etapa em “Meu roteiro por etapas”.</p>
      </Passo>

      <Passo n={17} titulo="Etapa 3 · Contabilidade Avançada (CA)">
        <p>São cinco telas, na ordem do menu: <b>Folha do mês</b>, <b>Provisões e encargos</b>, <b>Contabilização</b>, <b>Efeitos nas demonstrações</b> e <b>Parecer técnico</b>. Em cada uma você preenche o que é pedido e a plataforma mostra “salvo”.</p>
        <p>Em Contabilização, o botão <b>Levar para o Livro diário</b> abre o Livro diário com os dados já preenchidos. Salve uma vez só e não leve o mesmo fato duas vezes. O professor precisa aprovar o lançamento, como em qualquer outro.</p>
      </Passo>

      <Passo n={18} titulo="Etapa 4 · Rescisão trabalhista (CA)">
        <p>São seis telas: <b>Caso e direitos</b>, <b>Cálculo das verbas</b>, <b>Incidências</b>, <b>Contabilização</b>, <b>Documentos e prazos</b> e <b>Conferência final</b>. A Conferência final verifica os fatos, os dados e os valores e mostra o resultado: “Aprovado” quando tudo confere, “Revisar” quando há pontos a rever e “Bloqueado” quando falta muito. Para cada ponto, ela diz qual tela revisar.</p>
      </Passo>

      <Passo n={19} titulo="Etapa 5 · Análise gerencial de balanços (AGB)">
        <p>São quatro telas: <b>Análise vertical e horizontal</b>, <b>Indicadores</b>, <b>Capital de giro</b> e <b>Parecer e relatório final</b>. Os valores são calculados a partir da escrituração da sua empresa didática e do período anterior que o professor gera; você interpreta os números e escreve o parecer.</p>
      </Passo>

      <Passo n={20} titulo="Etapa 6 · Análise comparativa (AGB)">
        <p>Tem duas telas: <b>Exercícios comparativos</b> e <b>Comparativo entre empresas</b>. O professor libera os exercícios aos poucos, um por vez. Você analisa cada empresa e depois compara com a “Minha empresa”, para chegar ao parecer comparativo.</p>
      </Passo>

      <div className="helper-note">Dúvidas sobre o conteúdo contábil em si (qual conta usar, se um CFOP está certo) são parte do exercício — o sistema não responde por você. Procure o professor, ou use o <b>Suporte</b> (grupo Controle) para perguntar pela própria plataforma.</div>
    </>
  );
}

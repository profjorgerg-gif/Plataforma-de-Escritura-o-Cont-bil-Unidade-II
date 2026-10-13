export default function ManualProfessor() {
  return (
    <>
      <div className="screen-eyebrow">manual</div>
      <h2 className="screen-title">Manual do Professor</h2>
      <p className="screen-sub">Como conduzir o Projeto Interdisciplinar CI–CA–AGB pela plataforma: a etapa 1 · Escrituração nas seções 1 a 7, e a organização do menu, as etapas 2 a 6, a avaliação e o roteiro de testes nas seções 8 a 15.</p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        <button className="btn secondary" onClick={() => window.print()}>🖨️ Imprimir / Salvar como PDF</button>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>1. Entrar no sistema</h3></div>
        <div className="panel-body">
          <p>Acesse o site e clique em <b>Continuar com Google</b>, usando o mesmo e-mail que está cadastrado como professor. Em seguida o sistema pede uma <b>senha adicional</b> — essa senha fica guardada só no Firestore (coleção <code className="mono">configuracao</code>, documento <code className="mono">professor</code>) e nenhum aluno consegue lê-la, mesmo por engano, porque a regra de segurança só libera a leitura para quem já tem o papel "professor" ou "admin".</p>
          <p>Essa senha é pedida de novo a cada acesso — é uma camada extra de fricção para um computador da escola não ficar com o Painel do Professor aberto para qualquer um; a barreira de verdade continua sendo a promoção manual do seu usuário a "professor" no Console Firebase.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>2. Turmas e alunos</h3></div>
        <div className="panel-body">
          <p>Em <b>Turmas</b>, crie a turma e cadastre os alunos — nome + matrícula, um por um, ou de uma vez importando um <b>PDF</b> com a lista (o sistema tenta reconhecer nome e matrícula automaticamente; sempre revise antes de confirmar).</p>
          <p>É essa matrícula que cada aluno vai digitar a cada login — sem ela cadastrada aqui antes, o aluno não consegue confirmar acesso.</p>
          <p>Ainda em Turmas, defina o <b>prazo da etapa 1</b> e a política de desconto por atraso (penalidade no 1º dia + valor por dia adicional) — isso alimenta o cálculo automático que aparece depois em Avaliação.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>3. Documentos fiscais</h3></div>
        <div className="panel-body">
          <p>Em <b>Documentos fiscais</b>, cadastre cada NF-e didática (número, itens, impostos, totais) — isso vira o "gabarito" contra o qual a digitação do aluno é conferida. Dá para cadastrar um por vez, partir de um dos <b>modelos prontos</b> (venda, compra, devolução) para agilizar, ou importar vários de uma vez via <b>ZIP de PDFs</b> (os arquivos entram como rascunho, aguardando você completar os dados).</p>
          <p>Um documento só aparece para os alunos depois de você clicar em <b>liberar para a turma</b> — o catálogo é compartilhado entre turmas, mas a liberação é por turma.</p>
          <p>Ao importar por ZIP, o sistema só lê o <b>nome do arquivo</b> (número e direção) — os itens e valores ficam em branco. Para preenchê-los sem digitar tudo de novo, abra "preencher gabarito" no documento importado e use o bloco <b>Gerar gabarito com IA</b>: copie o prompt pronto, cole numa IA de sua própria conta (Claude.ai, ChatGPT etc.) anexando o PDF original, e cole o JSON de resposta de volta no sistema — os campos vêm preenchidos, mas continuam editáveis, então você sempre revisa antes de salvar. Como nenhuma chave de IA fica guardada no sistema, isso continua funcionando no plano gratuito do Firebase.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>4. Plano de contas</h3></div>
        <div className="panel-body">
          <p>A lista de contas é institucional (vale para todas as turmas). Use a busca para achar rápido, e <b>+ Nova conta</b> se faltar alguma — natureza e demonstração (BP/DRE/ARE) são sugeridas automaticamente pelo grupo escolhido.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>5. Corrigindo lançamentos</h3></div>
        <div className="panel-body">
          <p>Em <b>Fila de correção</b> aparecem todos os lançamentos enviados por qualquer aluno da turma, com o nome e a matrícula de quem enviou em destaque, há quanto tempo está esperando e, se já foi devolvido antes, o número da rodada de correção ("🔁 reenvio — correção nº N"). A fila fica ordenada do mais antigo para o mais novo, para você atender primeiro quem está esperando há mais tempo.</p>
          <p>Compare com o documento de origem — dá para abrir a análise fiscal e a classificação contábil daquele mesmo documento direto na tela, sem trocar de aba — e clique <b>Aprovar</b> ou <b>Devolver para correção</b> (escreva uma observação — é isso que o aluno vê). Cada devolução fica guardada no <b>histórico de correções</b> do lançamento, visível tanto para você quanto para o aluno, mesmo depois de aprovado.</p>
          <p>Só lançamentos aprovados entram no Razão, Balancete e demonstrações do aluno.</p>
          <p><b>Histórico do aluno</b> mostra tudo o que aquele aluno já lançou, aprovado ou não — clique num aluno na tela de Turmas para abrir o histórico dele.</p>
          <p>Um indicador (badge) no menu mostra, a qualquer momento, quantos lançamentos estão esperando sua correção.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>6. Avaliação da etapa 1</h3></div>
        <div className="panel-body">
          <p>A nota da etapa 1 é composta por uma rubrica de três partes, calculada em Alunos e notas → Notas e avaliação (aba Notas · Etapa 1). Cada componente aparece como "pontos ganhos de pontos possíveis" (ex.: 3,6 de 4,5) — não em porcentagem nem solto de 0 a 10 — para que o peso e o resultado apareçam juntos, e os três valores somados batam visivelmente com a nota final:</p>
          <ul style={{ margin: "0 0 12px", paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Completude do ciclo (até 4,5 pontos, automático)</b> — proporcional ao % de documentos liberados em que o aluno concluiu as 4 etapas (Digitação → Análise fiscal → Classificação → Lançamento aprovado).</li>
            <li><b>Qualidade técnica (até 3,5 pontos, manual)</b> — o único campo que você preenche, de 0 a 10: seu julgamento sobre a coerência do raciocínio contábil, olhando classificações e justificativas.</li>
            <li><b>Autonomia (até 2,0 pontos, automático)</b> — proporcional a quanto menos rodadas de correção em média cada lançamento precisou até ser aprovado. Errar e corrigir não zera essa parte — o peso é propositalmente pequeno.</li>
          </ul>
          <p>O desconto por atraso continua sendo aplicado por fora, no final, calculado sozinho a partir da política definida em Turmas (mas você pode sempre sobrescrever).</p>
          <p>Tudo isso só aparece para o aluno (decomposto, não só o número final) depois que você clicar em <b>liberar</b>. Prorrogações individuais de prazo (para um aluno específico) também ficam nessa tela, com histórico preservado.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>7. Testar como aluno</h3></div>
        <div className="panel-body">
          <p>Em <b>Modo de teste</b> (menu “manutenção (com cuidado)”, no fim do menu), crie uma conta de teste e clique em "Entrar no modo de teste" para navegar pelas telas do aluno com seu próprio login — sem precisar de uma segunda conta Google. Um aviso fica visível o tempo todo enquanto você está nesse modo, e um botão leva de volta ao Painel a qualquer momento. Essa conta nunca se mistura com dados de alunos reais.</p>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>8. O menu do professor</h3></div>
        <div className="panel-body">
          <p>O menu está organizado pelo que você faz, e não por tipo de gestão. <b>Todo dia</b>: Hoje, Fila de correção, Suporte e Diretriz da semana (quadro). <b>Planejar o ciclo</b>: Etapas, prazos e liberação (abas Etapas e prazos, Cronograma e Liberar etapas e situação dos alunos) e Turmas. <b>Etapas do projeto</b>: Etapa 1 · Escrituração (abas Painel do professor e Documentos fiscais), Etapas 2–3 · CA, Etapa 4 · Rescisão, Etapas 5–6 · AGB e Atividade da folha. <b>Alunos e notas</b>: Alunos (abas Histórico do aluno, Registro do processo e Relatório de orientação) e Notas e avaliação (abas Notas · Etapa 1, Avaliação das etapas e Dashboard do ciclo). <b>Materiais</b>: Caderno do Aluno (imprimir), Roteiro do Aluno, Consultas (abas Plano de contas e Consulta CFOP/NCM) e Modelos de mensagens. No fim ficam dois grupos fechados por padrão: <b>Ajuda</b> (Guias e manuais, com o Guia do professor e os manuais em abas, e o 🧪 Roteiro de testes) e <b>Manutenção (com cuidado)</b> (Modo de teste e Refazer nota do aluno, com o aviso de que mexe nos dados).</p>
          <p>A primeira tela é o <b>🧭 Hoje</b>: mostra o que exige ação hoje (fila de correção e perguntas novas no suporte), diz onde fica cada coisa no menu, com botões “Abrir”, e traz a rotina sugerida em cada etapa. Os prazos das etapas não aparecem mais ali: ficam em “Etapas, prazos e liberação”. Ela só consulta; não grava nada.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>9. Botão “← Voltar”</h3></div>
        <div className="panel-body">
          <p>Em todas as telas, exceto no Hoje, aparece no topo o botão <b>← Voltar</b>, com o nome da tela de destino. Ele leva à tela de onde você veio (guarda as últimas 30), para você não precisar clicar no menu de novo. A lista é reiniciada ao entrar ou sair do modo de teste.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>10. Etapas, prazos e liberação</h3></div>
        <div className="panel-body">
          <p>As 6 etapas são: <b>1 Escrituração</b> (CI), <b>2 Folha de pagamento</b> (CA), <b>3 Folha, provisões e contabilização</b> (CA), <b>4 Rescisão trabalhista</b> (CA), <b>5 Análise gerencial de balanços</b> (AGB) e <b>6 Análise comparativa</b> (AGB).</p>
          <p>O item “Etapas, prazos e liberação” tem três abas: <b>Etapas e prazos</b> (datas e aulas de cada etapa), <b>Cronograma</b> (o desenho das 6 etapas) e <b>Liberar etapas e situação dos alunos</b> (liberar, pedir ajuste, aprovar). A <b>Atividade da folha</b> é um item à parte, em “Etapas do projeto” (lista de empregados, mínimo de contracheques e a sugestão ao aluno).</p>
          <p>Fluxo de cada etapa: o aluno entrega; você abre a etapa dele em “Etapas, prazos e liberação”, aba “Liberar etapas e situação dos alunos”, e escolhe <b>Pedir ajuste</b> (com um retorno escrito) ou <b>Aprovar e liberar a próxima</b>. Também há <b>Liberar para todos</b>, para abrir uma etapa para a turma inteira.</p>
          <p>As etapas ainda não liberadas aparecem no menu do aluno com a etiqueta “Bloqueada”, e não ficam escondidas. A conta de teste vê todas as etapas abertas.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>11. Configurando as etapas 2 a 6 na turma</h3></div>
        <div className="panel-body">
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
            <li><b>Etapa 2 (folha):</b> em “Atividade da folha”, clique em <b>Publicar lista a partir dos alunos da turma</b> para definir os empregados (a conta de teste não entra), defina o mínimo de contracheques e, se quiser, uma sugestão. A <b>trava</b> (“Ligar a trava”) bloqueia as demais telas da folha, da etapa 3, até você aprovar a atividade da folha; deixe desligada se não quiser essa exigência.</li>
            <li><b>Etapas 2 e 3 (CA):</b> em “Etapas 2–3 · CA”, use <b>Liberar aos alunos</b>, confira as contas e defina a folha do mês. Você acompanha os trabalhos dos alunos na mesma tela.</li>
            <li><b>Etapa 4 (Rescisão):</b> em “Etapa 4 · Rescisão”, confira as 3 contas novas em “Liberação e contas” antes de clicar em <b>Liberar aos alunos</b>.</li>
            <li><b>Etapas 5 e 6 (AGB):</b> em “Etapas 5–6 · AGB”, use <b>Gerar período anterior</b> para cada aluno, libere as etapas e libere os <b>exercícios comparativos</b> aos poucos (um por vez).</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>12. Avaliação das etapas (0 a 10) e notas</h3></div>
        <div className="panel-body">
          <p>Em <b>Notas e avaliação</b>, aba <b>Avaliação das etapas</b>, escolha a etapa e o aluno. Os critérios aparecem com uma sugestão automática de nota (por exemplo, cálculos conferidos e quantidade de contracheques na folha). Você ajusta a nota de 0 a 10, marca o desconto de <b>2,0 pontos por atraso</b> quando for o caso, escreve o comentário e marca <b>Mostrar esta nota e o retorno ao aluno</b>. Enquanto não marcar, o aluno não vê nada.</p>
          <p>A aba <b>Notas · Etapa 1</b> traz o quadro pronto para você digitar as notas no sistema da escola ao fim de cada etapa. A etapa 1 mantém a sua rubrica própria (seção 6).</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>13. Roteiro de testes</h3></div>
        <div className="panel-body">
          <p>O item <b>🧪 Roteiro de testes</b> traz 57 passos em 13 blocos, cada um com o que fazer e o resultado esperado. O botão do passo abre a tela certa e troca sozinho para professor ou aluno de teste. Durante o passo, uma faixa amarela oferece <b>✓ Concluído · voltar ao roteiro</b> e <b>Voltar sem concluir</b>.</p>
          <p>Faça os testes numa turma com “TESTE” no nome (com três alunos fictícios e a conta de teste) para não misturar com a turma real. O progresso do roteiro fica só no navegador, por professor e turma; ele não grava nada no Firestore. O roteiro e o modo de teste são exclusivos do professor: os alunos não veem nenhum dos dois.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>14. Cronograma, PDF e imagem</h3></div>
        <div className="panel-body">
          <p>A aba <b>Cronograma</b> (dentro de “Etapas, prazos e liberação”) desenha as 6 etapas em barras, ao longo das semanas, com a linha de “hoje”, e traz uma tabela com período, prazo, aulas e o que entregar. É sempre o cronograma da <b>turma selecionada</b>: os prazos são os da aba “Etapas e prazos”, e mudou o prazo, o desenho muda junto.</p>
          <p>Cada etapa começa no primeiro dia útil depois do prazo da anterior (a etapa 1 começa em 28/09). O botão <b>Mostrar andamento da turma</b> lê, uma vez, a situação de cada aluno e mostra, por etapa, a quantos alunos ela está liberada, quantos estão aprovados e quantos aguardam a sua análise; etapas não liberadas a ninguém ficam hachuradas. O botão <b>↻ Atualizar andamento</b> lê de novo.</p>
          <p><b>Imprimir / Salvar PDF</b> abre a impressão do navegador com a folha em A4 paisagem (escolha “Salvar como PDF” no destino). <b>Salvar imagem (PNG)</b> baixa a mesma folha como imagem, para colar em Word, Classroom ou WhatsApp. Os alunos têm o mesmo item, com a situação de cada etapa deles.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>15. Cuidado com os dados dos alunos</h3></div>
        <div className="panel-body">
          <p>Reorganizar menus, prazos e liberações nunca apaga o que os alunos digitaram. A única ação que apaga dados é <b>Refazer nota do aluno</b>, que fica marcada com o aviso “mexe nos dados” e guarda uma cópia na lixeira. Faça o <b>Baixar backup</b> antes de qualquer mudança grande.</p>
        </div>
      </div>
    </>
  );
}

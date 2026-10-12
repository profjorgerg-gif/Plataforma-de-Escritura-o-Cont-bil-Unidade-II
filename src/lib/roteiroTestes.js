// Roteiro de testes do Projeto Interdisciplinar (modo de teste do professor). Só DADOS: não lê nem grava nada no Firestore.
// quem: "prof" = abrir como professor · "aluno" = abrir como a conta de teste · null = passo manual (sem tela de destino)
// tela: chave da tela do menu (a mesma de sempre)
export const BLOCOS_TESTE = [
  {
    "n": "1",
    "titulo": "Preparar o ambiente de teste",
    "sub": "Cerca de 5 minutos. Faça uma vez.",
    "passos": [
      {
        "id": "1.1",
        "fazer": "Clique em \"Baixar backup\" (barra do topo) na turma real.",
        "esperado": "Baixa o arquivo de backup. Só por segurança, antes de testar.",
        "quem": null,
        "tela": null
      },
      {
        "id": "1.2",
        "fazer": "Menu Organização → Turmas → \"Nova turma\". Crie a turma \"TESTE\" e selecione-a.",
        "esperado": "No topo aparece \"Turma: TESTE\".",
        "quem": "prof",
        "tela": "turmas"
      },
      {
        "id": "1.3",
        "fazer": "Na turma TESTE, clique em \"+ Adicionar aluno\" três vezes, com nomes fictícios (ex.: Ana Teste, Bruno Teste, Carla Teste).",
        "esperado": "Os 3 nomes aparecem na lista de alunos. Eles serão os empregados da folha.",
        "quem": "prof",
        "tela": "turmas"
      },
      {
        "id": "1.4",
        "fazer": "Menu \"Ferramentas e manuais\" (fim do menu) → Modo de teste → \"+ Criar conta de teste\".",
        "esperado": "Aparece uma conta de teste (matrícula TESTE-…). O botão de entrar nela fica nessa mesma tela.",
        "quem": "prof",
        "tela": "modoteste"
      }
    ]
  },
  {
    "n": "2",
    "titulo": "Tela de acesso e menu do professor",
    "sub": "Veja a plataforma como professor.",
    "passos": [
      {
        "id": "2.1",
        "fazer": "Abra o endereço da plataforma com Ctrl+F5 (sem estar logado).",
        "esperado": "Título \"Projeto Interdisciplinar CI–CA–AGB\" e a lista \"Etapas do projeto\" com as 6 etapas e as disciplinas CI, CA e AGB.",
        "quem": null,
        "tela": null
      },
      {
        "id": "2.2",
        "fazer": "Entre como professor.",
        "esperado": "Abre em \"Comece aqui\", com \"Hoje\" (fila e suporte), os 4 grupos e a rotina sugerida.",
        "quem": "prof",
        "tela": "inicio"
      },
      {
        "id": "2.3",
        "fazer": "Confira o menu lateral.",
        "esperado": "Grupos P Planejamento, O Organização, D Direção e C Controle. \"Ferramentas e manuais\" no fim, recolhível.",
        "quem": "prof",
        "tela": "inicio"
      },
      {
        "id": "2.4",
        "fazer": "Abra \"Etapas e prazos\", \"Liberar etapas\" e \"Atividade da folha\".",
        "esperado": "Os três abrem a mesma tela do roteiro, cada um já na aba certa (Etapas e prazos, Situação dos alunos, Atividade da folha).",
        "quem": "prof",
        "tela": "roteiro-prazos"
      },
      {
        "id": "2.5",
        "fazer": "Em \"Comece aqui\", clique nos botões \"Abrir\" dos quatro grupos e da rotina.",
        "esperado": "Cada botão leva à tela indicada, sem erro.",
        "quem": "prof",
        "tela": "inicio"
      }
    ]
  },
  {
    "n": "3",
    "titulo": "Dados da turma real preservados",
    "sub": "Volte para a turma real. Só olhar, sem alterar nada.",
    "passos": [
      {
        "id": "3.1",
        "fazer": "Selecione a turma real (Organização → Turmas). Abra \"Painel do professor\" e \"Dashboard do ciclo\".",
        "esperado": "Os alunos e o andamento aparecem como antes.",
        "quem": "prof",
        "tela": "turmas"
      },
      {
        "id": "3.2",
        "fazer": "Abra \"Histórico do aluno\" de um aluno real que já tenha lançamentos.",
        "esperado": "Os lançamentos, as digitações e as classificações dele aparecem.",
        "quem": "prof",
        "tela": "historico"
      },
      {
        "id": "3.3",
        "fazer": "Compare o número no item \"Fila de correção\" com a tela da fila.",
        "esperado": "O contador do menu é igual ao número de lançamentos aguardando correção.",
        "quem": "prof",
        "tela": "fila"
      }
    ]
  },
  {
    "n": "4",
    "titulo": "Planejamento: etapas, prazos e folha",
    "sub": "Volte para a turma TESTE.",
    "passos": [
      {
        "id": "4.1",
        "fazer": "Planejamento → \"Etapas e prazos\".",
        "esperado": "As 6 etapas com os prazos 16/10, 23/10, 05/11, 11/11, 19/11 e 25/11.",
        "quem": "prof",
        "tela": "roteiro-prazos"
      },
      {
        "id": "4.2",
        "fazer": "Mude o prazo da etapa 2 para outra data e salve.",
        "esperado": "Aparece a confirmação de salvo. Em \"Comece aqui\", o prazo novo aparece na tabela da turma.",
        "quem": "prof",
        "tela": "roteiro-prazos"
      },
      {
        "id": "4.3",
        "fazer": "Planejamento → \"Atividade da folha\". Clique em \"Publicar lista a partir dos alunos da turma\".",
        "esperado": "Mensagem \"lista publicada com 3 empregados\". A conta de teste não entra na lista.",
        "quem": "prof",
        "tela": "roteiro-folha"
      },
      {
        "id": "4.4",
        "fazer": "Na mesma tela, deixe o mínimo em 3, escreva uma sugestão e salve. Não ligue a trava.",
        "esperado": "Aparece \"salvo\". O botão da trava continua dizendo \"Ligar a trava\".",
        "quem": "prof",
        "tela": "roteiro-folha"
      }
    ]
  },
  {
    "n": "5",
    "titulo": "Entrar como aluno (conta de teste)",
    "sub": "Modo de teste → entrar na conta de teste da turma TESTE.",
    "passos": [
      {
        "id": "5.1",
        "fazer": "Entre na conta de teste.",
        "esperado": "Faixa vermelha \"Você está agindo como a conta de teste\". Abre em \"Comece aqui\" do aluno.",
        "quem": "aluno",
        "tela": "inicio"
      },
      {
        "id": "5.2",
        "fazer": "Leia o \"Comece aqui\".",
        "esperado": "\"Você está aqui: etapa 1 de 6 · Escrituração\", os 4 grupos e a tabela das 6 etapas.",
        "quem": "aluno",
        "tela": "inicio"
      },
      {
        "id": "5.3",
        "fazer": "Confira o menu do aluno.",
        "esperado": "P Planejamento, O Organização, D Direção com as 6 etapas, C Controle. A etapa 1 mostra os 10 passos numerados.",
        "quem": "aluno",
        "tela": "inicio"
      },
      {
        "id": "5.4",
        "fazer": "Abra rapidamente: Empresa didática, Documentos fiscais, Livro diário, Balanço patrimonial e Meu progresso.",
        "esperado": "Todas abrem, sem tela em branco nem erro. No topo aparece a faixa \"Etapa 1 de 6\".",
        "quem": "aluno",
        "tela": "empresa"
      },
      {
        "id": "5.5",
        "fazer": "Planejamento → \"Meu roteiro por etapas\". Abra também a aba \"Cópia para imprimir\".",
        "esperado": "\"Você está na etapa 1\", com prazo e aulas. Etapa 1 liberada, as demais bloqueadas. A cópia para imprimir abre.",
        "quem": "aluno",
        "tela": "etapas"
      }
    ]
  },
  {
    "n": "6",
    "titulo": "Atividade da folha (etapa 2)",
    "sub": "Direção → etapa 2 → \"Atividade · Elaborar a folha\". Em cada empregado, preencha a \"Situação\" e depois a coluna \"Meu cálculo\" de cada linha do contracheque (a coluna \"Como calcular\" explica a conta).",
    "passos": [
      {
        "id": "6.1",
        "fazer": "Confira a tela antes de começar.",
        "esperado": "Aparecem os 3 nomes como botões, o contador \"0 de 3 contracheques conferidos (mínimo)\" e a sua sugestão, se você escreveu uma.",
        "quem": "aluno",
        "tela": "ca-ativ"
      },
      {
        "id": "6.2",
        "fazer": "Ana Teste: Salário-base 3.000,00 e mais nada (sem adicional, faltas, dependentes, filhos ou VT). Preencha o contracheque inteiro.",
        "esperado": "Valores certos: INSS 248,58 · IRRF 0,00 · líquido 2.751,42. O sistema confere cada linha e o nome dela ganha ✓ quando todas conferem.",
        "quem": "aluno",
        "tela": "ca-ativ"
      },
      {
        "id": "6.3",
        "fazer": "Bruno Teste: Salário-base 6.000,00 e Dependentes 1.",
        "esperado": "Valores certos: INSS 641,50 · IRRF 332,97 · líquido 5.025,53.",
        "quem": "aluno",
        "tela": "ca-ativ"
      },
      {
        "id": "6.4",
        "fazer": "Carla Teste: Salário-base 1.800,00 e Filhos até 14 anos 2.",
        "esperado": "Valores certos: INSS 137,68 · IRRF 0,00 · salário-família 135,08 · líquido 1.797,40. O contador chega a \"3 de 3\" e aparece \"pronto para análise do professor\".",
        "quem": "aluno",
        "tela": "ca-ativ"
      },
      {
        "id": "6.5",
        "fazer": "Num empregado, digite um valor errado de propósito (ex.: INSS 300,00 para a Ana).",
        "esperado": "Essa linha não confere. Corrija para 248,58 e confira que passa.",
        "quem": "aluno",
        "tela": "ca-ativ"
      },
      {
        "id": "6.6",
        "fazer": "Opcional, casos especiais (troque a situação da Ana): 3.000,00 com 2 faltas; 3.000,00 com Vale-transporte e custo 200,00; 9.000,00.",
        "esperado": "Faltas (2, sem informar semanas): desconto 400,00, INSS 209,68, líquido 2.390,32. VT: desconto 180,00 e líquido 2.571,42. Salário 9.000,00: INSS 988,07 (teto), IRRF 1.294,55, líquido 6.717,38.",
        "quem": "aluno",
        "tela": "ca-ativ"
      },
      {
        "id": "6.7",
        "fazer": "Escreva algo em \"Meu resumo sobre a folha\" e confira que o texto fica salvo ao sair e voltar.",
        "esperado": "O texto continua lá. A tela indica que foi salvo.",
        "quem": "aluno",
        "tela": "ca-ativ"
      }
    ]
  },
  {
    "n": "7",
    "titulo": "Entregar, analisar e liberar",
    "sub": "Primeiro como aluno, depois como professor.",
    "passos": [
      {
        "id": "7.1",
        "fazer": "Como aluno de teste: em \"Meu roteiro por etapas\", clique em \"Entregar\" na etapa 1.",
        "esperado": "Aparece \"Entrega registrada. Aguarde a análise do professor.\" A situação muda para \"Entregue\".",
        "quem": "aluno",
        "tela": "etapas"
      },
      {
        "id": "7.2",
        "fazer": "Como professor: em \"Liberar etapas\" (aba Situação dos alunos), escolha a conta de teste, abra a etapa 1 e clique em \"Pedir ajuste\", com um retorno escrito.",
        "esperado": "A conta de teste aparece com a etapa 1 entregue. Depois de pedir o ajuste, salvo.",
        "quem": "prof",
        "tela": "roteiro-lib"
      },
      {
        "id": "7.3",
        "fazer": "Como aluno de teste: em \"Meu roteiro por etapas\", veja a etapa 1 e clique em \"Entregar\" de novo.",
        "esperado": "A etapa 1 aparece como \"Ajustar e reenviar\", com o seu retorno. Depois de entregar de novo, aparece \"Reenviada, aguardando análise\".",
        "quem": "aluno",
        "tela": "etapas"
      },
      {
        "id": "7.4",
        "fazer": "Como professor: em \"Liberar etapas\", abra a etapa 1 da conta de teste e clique em \"Aprovar e liberar a próxima\".",
        "esperado": "A etapa 1 fica \"Aprovada\" e a etapa 2 passa a \"Liberada\".",
        "quem": "prof",
        "tela": "roteiro-lib"
      },
      {
        "id": "7.5",
        "fazer": "Como professor: teste também \"Liberar para todos\" numa etapa.",
        "esperado": "A etapa fica liberada para todos os alunos da turma TESTE.",
        "quem": "prof",
        "tela": "roteiro-lib"
      }
    ]
  },
  {
    "n": "8",
    "titulo": "Avaliação de 0 a 10 e retorno ao aluno",
    "sub": "Controle → \"Avaliação das etapas (0 a 10)\".",
    "passos": [
      {
        "id": "8.1",
        "fazer": "Escolha a etapa da folha e a conta de teste.",
        "esperado": "Os critérios aparecem com a sugestão automática de nota (cálculos conferidos e quantidade de contracheques).",
        "quem": "prof",
        "tela": "aval-prof"
      },
      {
        "id": "8.2",
        "fazer": "Marque o desconto de 2,0 pontos por atraso, escreva um comentário, marque \"Mostrar esta nota e o retorno ao aluno\" e salve.",
        "esperado": "A nota da etapa mostra o desconto aplicado e aparece \"salvo\".",
        "quem": "prof",
        "tela": "aval-prof"
      },
      {
        "id": "8.3",
        "fazer": "Na conta de teste: Controle → \"Notas e retornos\".",
        "esperado": "A nota por critério, o desconto e o seu comentário aparecem. Antes de marcar \"Mostrar ao aluno\", nada aparecia.",
        "quem": "aluno",
        "tela": "notas-etapas"
      },
      {
        "id": "8.4",
        "fazer": "Como professor: Controle → \"Notas\".",
        "esperado": "O quadro de notas abre, pronto para você digitar no sistema da escola.",
        "quem": "prof",
        "tela": "notas"
      }
    ]
  },
  {
    "n": "9",
    "titulo": "Contabilidade Avançada (etapa 3)",
    "sub": "Organização → \"Etapa 3 · CA (turma)\".",
    "passos": [
      {
        "id": "9.1",
        "fazer": "Libere as etapas 2 e 3 (CA) aos alunos (botão \"Liberar aos alunos\").",
        "esperado": "A etiqueta passa a \"Liberada aos alunos\".",
        "quem": "prof",
        "tela": "ca-prof"
      },
      {
        "id": "9.2",
        "fazer": "Na conta de teste: abra Folha do mês, Provisões e encargos, Contabilização, Efeitos nas demonstrações e Parecer técnico.",
        "esperado": "As 5 telas abrem. Preencha algo em uma delas e confira que \"salvo\" aparece.",
        "quem": "aluno",
        "tela": "ca-folha"
      },
      {
        "id": "9.3",
        "fazer": "Em Contabilização, clique em \"Levar para o Livro diário\" num lançamento.",
        "esperado": "Abre o Livro diário com os dados já preenchidos. Salve uma vez só e não leve o mesmo fato duas vezes.",
        "quem": "aluno",
        "tela": "ca-cont"
      }
    ]
  },
  {
    "n": "10",
    "titulo": "Rescisão trabalhista (etapa 4)",
    "sub": "Organização → \"Etapa 4 · Rescisão (turma)\".",
    "passos": [
      {
        "id": "10.1",
        "fazer": "Na conta de teste (que sempre vê a rescisão), abra as 6 telas até \"Conferência final\".",
        "esperado": "As 6 abrem. Na Conferência final, o resultado aparece como Aprovado quando tudo está certo.",
        "quem": "aluno",
        "tela": "resc-caso"
      },
      {
        "id": "10.2",
        "fazer": "Antes de liberar aos alunos, confira as 3 contas novas em \"Liberação e contas\".",
        "esperado": "As 3 contas novas da rescisão aparecem para liberar.",
        "quem": "prof",
        "tela": "resc-prof"
      },
      {
        "id": "10.3",
        "fazer": "Só então clique em \"Liberar aos alunos\" (na turma TESTE).",
        "esperado": "A etiqueta passa a \"Liberada aos alunos\".",
        "quem": "prof",
        "tela": "resc-prof"
      }
    ]
  },
  {
    "n": "11",
    "titulo": "Análise gerencial e comparativo (etapas 5 e 6)",
    "sub": "Organização → \"Etapas 5–6 · AGB (turma)\".",
    "passos": [
      {
        "id": "11.1",
        "fazer": "Escolha um aluno e clique em \"Gerar período anterior\".",
        "esperado": "O período anterior é gerado e aparece na tela.",
        "quem": "prof",
        "tela": "agb-prof"
      },
      {
        "id": "11.2",
        "fazer": "Libere as etapas 5 e 6 (AGB) aos alunos e libere os exercícios comparativos.",
        "esperado": "A etiqueta fica \"Liberada aos alunos\" e os exercícios liberados aparecem na lista.",
        "quem": "prof",
        "tela": "agb-prof"
      },
      {
        "id": "11.3",
        "fazer": "Na conta de teste: abra Análise vertical e horizontal, Indicadores, Capital de giro, Parecer e relatório final.",
        "esperado": "As 4 abrem, com os valores calculados a partir da escrituração.",
        "quem": "aluno",
        "tela": "agb-av"
      },
      {
        "id": "11.4",
        "fazer": "Abra \"Exercícios comparativos\" e \"Comparativo entre empresas\" (etapa 6).",
        "esperado": "As duas abrem, com os exercícios liberados e a comparação com \"Minha empresa\".",
        "quem": "aluno",
        "tela": "agb-ex"
      }
    ]
  },
  {
    "n": "12",
    "titulo": "Fechamento",
    "sub": "",
    "passos": [
      {
        "id": "12.1",
        "fazer": "Clique em \"Sair do modo de teste\".",
        "esperado": "Volta ao \"Comece aqui\" do professor.",
        "quem": "prof",
        "tela": "inicio"
      },
      {
        "id": "12.2",
        "fazer": "Abra a plataforma no celular e abra o menu (botão ☰).",
        "esperado": "Os grupos, as etapas e as etiquetas de situação ficam legíveis, sem cortar o texto.",
        "quem": null,
        "tela": null
      },
      {
        "id": "12.3",
        "fazer": "Volte à turma real e confira que nada mudou (prazos, empregados, liberações).",
        "esperado": "A turma real continua como estava, pois todos os testes foram na turma TESTE.",
        "quem": "prof",
        "tela": "turmas"
      }
    ]
  },
  {
    "n": "13",
    "titulo": "Cronograma, PDF e imagem",
    "sub": "Pode ser feito a qualquer momento, depois do bloco 4. Cerca de 5 minutos.",
    "passos": [
      {
        "id": "13.1",
        "fazer": "Planejamento → \"Cronograma\".",
        "esperado": "Folha com o título \"Cronograma das 6 etapas\", a linha vermelha \"HOJE\", as barras das 6 etapas nas cores de CI, CA e AGB e a tabela com período, prazo, aulas e o que entregar. Na conta de teste todas as etapas aparecem abertas, sem hachura.",
        "quem": "aluno",
        "tela": "cronograma"
      },
      {
        "id": "13.2",
        "fazer": "Clique em \"Imprimir / Salvar PDF\". No destino, escolha \"Salvar como PDF\" e abra o arquivo.",
        "esperado": "A folha sai em uma única página A4 paisagem, só com o cronograma (sem menu nem botões).",
        "quem": "aluno",
        "tela": "cronograma"
      },
      {
        "id": "13.3",
        "fazer": "Clique em \"Salvar imagem (PNG)\" e abra o arquivo baixado.",
        "esperado": "Baixa um arquivo cronograma-...png com o mesmo desenho da tela, com fundo branco e texto legível.",
        "quem": "aluno",
        "tela": "cronograma"
      },
      {
        "id": "13.4",
        "fazer": "Como professor: Planejamento → \"Cronograma\" (turma TESTE). Clique em \"Mostrar andamento da turma\".",
        "esperado": "Os prazos são os da turma TESTE. Depois de carregar, a tabela mostra \"Liberada a 3 de 3\" na etapa 1 e \"Não liberada\" nas demais, que ficam hachuradas.",
        "quem": "prof",
        "tela": "cronograma"
      },
      {
        "id": "13.5",
        "fazer": "Como professor: em \"Etapas e prazos\" mude o prazo da etapa 2 e salve. Volte ao \"Cronograma\" (botão Voltar).",
        "esperado": "A barra da etapa 2 termina na data nova e a barra da etapa 3 passa a começar no primeiro dia útil depois dela.",
        "quem": "prof",
        "tela": "roteiro-prazos"
      },
      {
        "id": "13.6",
        "fazer": "Como professor (turma TESTE): Planejamento → \"Caderno do Aluno (imprimir)\". Em \"Capa preenchida para\" escolha \"Um aluno da turma\" e um aluno. Marque \"Cabeçalho da escola na capa\", escreva duas linhas e clique em \"Imprimir / Salvar PDF\" (A4, margens Nenhuma, Salvar como PDF).",
        "esperado": "A capa mostra o cabeçalho que você escreveu, o nome, a turma e a matrícula do aluno e o seu nome como professor. O PDF tem 39 páginas A4, sem menu nem botões, e o cabeçalho só aparece na capa. Na conta de teste (modo aluno) o item não existe no menu.",
        "quem": "prof",
        "tela": "caderno"
      }
    ]
  }
];

export const PASSOS_TESTE = BLOCOS_TESTE.flatMap((b) => b.passos.map((p) => ({ ...p, bloco: b.n, blocoTitulo: b.titulo })));
export const passoDoTeste = (id) => PASSOS_TESTE.find((p) => p.id === id) || null;
export const proximoPasso = (feitos) => PASSOS_TESTE.find((p) => !feitos[p.id]) || null;

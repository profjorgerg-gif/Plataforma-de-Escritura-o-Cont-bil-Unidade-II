// Motor de processamento contábil — Diário aprovado → Razão → Balancete → DRE → Balanço Patrimonial
// Portado do protótipo (mesmas funções, testadas contra os dados reais da Unidade II).
// Funções puras: recebem lançamentos/contas, não tocam no Firestore.

function contaInfo(codigo, contas){ return contas.find(c => c.codigo === codigo); }

function lancamentosAprovados(lancamentos){
  return lancamentos.filter(l => l.status === "aprovado");
}

function calcularRazao(lancamentos, contas){
  const aprovados = lancamentosAprovados(lancamentos);
  const porConta = {};
  contas.forEach(c => porConta[c.codigo] = { conta:c, movimentos:[], totalD:0, totalC:0 });
  aprovados.forEach(l => {
    l.partidas.forEach(p => {
      const bucket = porConta[p.conta];
      if(!bucket) return;
      bucket.movimentos.push({ data:l.data, historico:l.historico, documento:l.documento, tipo:p.tipo, valor:p.valor, lancamentoId:l.id });
      if(p.tipo === "D") bucket.totalD += p.valor; else bucket.totalC += p.valor;
    });
  });
  return porConta;
}

function saldoConta(bucket){
  const c = bucket.conta;
  const saldo = c.natureza === "devedora" ? (bucket.totalD - bucket.totalC) : (bucket.totalC - bucket.totalD);
  return saldo;
}

function calcularBalancete(razao){
  return Object.values(razao).filter(b => b.movimentos.length > 0);
}

function calcularDRE(razao){
  const linhas = Object.values(razao).filter(b => b.conta.destino === "DRE" && b.movimentos.length > 0);
  const receitaBruta = linhas.filter(l => l.conta.grupo===4 && l.conta.subgrupo==="Receita Bruta de Vendas").reduce((s,l)=>s+saldoConta(l),0);
  const deducoes = linhas.filter(l => l.conta.grupo===4 && l.conta.redutora).reduce((s,l)=>s+saldoConta(l),0);
  const cmv = linhas.filter(l => l.conta.codigo.startsWith("6.2")).reduce((s,l)=>s+saldoConta(l),0);
  const despesasOp = linhas.filter(l => l.conta.grupo===5 && l.conta.subgrupo!=="Despesas Financeiras").reduce((s,l)=>s+saldoConta(l),0);
  const receitasFin = linhas.filter(l => l.conta.grupo===4 && l.conta.subgrupo==="Receitas Financeiras").reduce((s,l)=>s+saldoConta(l),0);
  const despesasFin = linhas.filter(l => l.conta.grupo===5 && l.conta.subgrupo==="Despesas Financeiras").reduce((s,l)=>s+saldoConta(l),0);
  const receitaLiquida = receitaBruta - deducoes;
  const resultadoBruto = receitaLiquida - cmv;
  const resultadoFinanceiro = receitasFin - despesasFin;
  const resultadoExercicio = resultadoBruto - despesasOp + resultadoFinanceiro;
  return { linhas, receitaBruta, deducoes, cmv, despesasOp, receitasFin, despesasFin, receitaLiquida, resultadoBruto, resultadoFinanceiro, resultadoExercicio };
}

function calcularBP(razao, resultadoExercicio){
  const ativos = Object.values(razao).filter(b => b.conta.grupo===1 && b.movimentos.length > 0);
  const passivos = Object.values(razao).filter(b => b.conta.grupo===2 && b.movimentos.length > 0);
  const pl = Object.values(razao).filter(b => b.conta.grupo===3 && b.movimentos.length > 0);
  const totalAtivo = ativos.reduce((s,l)=>s+saldoConta(l),0);
  const totalPassivo = passivos.reduce((s,l)=>s+saldoConta(l),0);
  const totalPLContas = pl.reduce((s,l)=>s+saldoConta(l),0);
  const totalPL = totalPLContas + resultadoExercicio;
  return { ativos, passivos, pl, totalAtivo, totalPassivo, totalPL, fecha: Math.abs(totalAtivo - (totalPassivo + totalPL)) < 0.005 };
}

function fmt(v){
  const n = Number(v)||0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function prazoEfetivo(aluno, turma){
  return aluno.prazoIndividual || turma.prazoUnidadeII || "";
}
function diasAtraso(dataEntrega, prazo){
  if(!prazo) return 0;
  const fim = dataEntrega || new Date().toISOString().slice(0,10);
  const d1 = new Date(prazo+"T00:00:00"), d2 = new Date(fim+"T00:00:00");
  const dias = Math.round((d2-d1)/86400000);
  return Math.max(0, dias);
}
function fmtData(iso){
  if(!iso) return "—";
  const [a,m,d] = iso.split("-");
  return d+"/"+m+"/"+a;
}
function descontoSugerido(dias, turma){
  if(dias <= 0) return 0;
  return (turma.penalidadeAtrasoFixa||0) + (dias-1) * (turma.descontoPorDiaAtraso||0);
}
function descontoEfetivo(aluno, turma){
  const dias = diasAtraso(aluno.dataEntrega, prazoEfetivo(aluno, turma));
  return aluno.descontoManual ? (aluno.desconto||0) : descontoSugerido(dias, turma);
}
function estatisticasAluno(matricula, dadosAlunos){
  const lancamentos = dadosAlunos[matricula]?.lancamentos || [];
  return {
    pendentes: lancamentos.filter(l=>l.status==="enviado").length,
    aprovados: lancamentos.filter(l=>l.status==="aprovado").length,
  };
}

// --------------------------------------------------------------------------
// Rubrica de avaliação da Unidade II — três componentes, cada um em 0-10:
//   1. Completude do ciclo (peso 45%) — automático, calculado a partir do
//      checklist por documento (Digitação → Análise fiscal → Classificação
//      → Livro diário aprovado), o mesmo dado que já alimenta o checklist
//      visual em "Meu progresso".
//   2. Qualidade técnica (peso 35%) — manual, é o julgamento do professor
//      sobre a coerência do raciocínio contábil; continua sendo o campo
//      "nota" já existente, só que agora representa só esta fatia, não a
//      nota inteira.
//   3. Autonomia (peso 20%) — automático, quanto menos rodadas de correção
//      em média um lançamento precisou até ser aprovado, maior a autonomia.
//      Sem lançamentos ainda, não penaliza (fica neutro em 10).
// O desconto por atraso continua sendo aplicado por fora, no final, como já
// era feito — juntar "pontualidade" dentro da rubrica ponderada duplicaria
// a penalidade que o desconto automático já aplica.
const PESOS_RUBRICA = { completude: 0.45, qualidade: 0.35, autonomia: 0.20 };

function completudeCiclo(documentos, digitacoes, analises, classificacoes, lancamentos){
  if(!documentos || documentos.length === 0) return null;
  let completos = 0;
  documentos.forEach((d) => {
    const digitado = !!(digitacoes && digitacoes[d.id]);
    const analisado = analises && analises[d.id]?.status === "enviado";
    const classificado = (classificacoes||[]).some((c) => c.documento === d.id);
    const lancado = (lancamentos||[]).some((l) => l.documento === d.id && l.status === "aprovado");
    if(digitado && analisado && classificado && lancado) completos++;
  });
  return Math.round((completos / documentos.length) * 100); // 0-100
}

function autonomiaCorrecoes(lancamentos){
  const lista = lancamentos || [];
  if(lista.length === 0) return null; // ainda não deu para avaliar
  const totalRodadas = lista.reduce((s,l) => s + (l.historicoCorrecoes?.length || 0), 0);
  const mediaPorLancamento = totalRodadas / lista.length;
  // cada rodada de correção, em média, reduz 25 pontos (de 100) — errar e
  // corrigir faz parte do aprendizado, por isso o peso final desse
  // componente é só 20%, não uma punição pesada.
  return Math.max(0, Math.round(100 - mediaPorLancamento * 25)); // 0-100
}

function notaFinalPonderada({ completudePct, qualidadeNota, autonomiaPct, desconto }){
  if(qualidadeNota === null || qualidadeNota === undefined || qualidadeNota === "") return null;
  const completude10 = completudePct === null || completudePct === undefined ? 0 : completudePct / 10;
  const autonomia10 = autonomiaPct === null || autonomiaPct === undefined ? 10 : autonomiaPct / 10;
  const bruta = completude10 * PESOS_RUBRICA.completude
    + Number(qualidadeNota) * PESOS_RUBRICA.qualidade
    + autonomia10 * PESOS_RUBRICA.autonomia;
  return Math.max(0, bruta - (Number(desconto) || 0));
}

export {
  contaInfo, lancamentosAprovados, calcularRazao, saldoConta, calcularBalancete,
  calcularDRE, calcularBP, fmt, prazoEfetivo, diasAtraso, fmtData,
  descontoSugerido, descontoEfetivo, estatisticasAluno,
  PESOS_RUBRICA, completudeCiclo, autonomiaCorrecoes, notaFinalPonderada,
};

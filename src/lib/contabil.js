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

export {
  contaInfo, lancamentosAprovados, calcularRazao, saldoConta, calcularBalancete,
  calcularDRE, calcularBP, fmt, prazoEfetivo, diasAtraso, fmtData,
  descontoSugerido, descontoEfetivo, estatisticasAluno,
};

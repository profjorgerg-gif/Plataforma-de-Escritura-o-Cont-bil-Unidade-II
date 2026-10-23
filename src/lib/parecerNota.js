// Parecer técnico sugerido para cada nota (2026-10-23). Funções PURAS: só montam o texto a partir dos números
// que o professor já vê na tela. O professor sempre lê, ajusta e decide se o aluno vê.
import { faixaDaNota } from "./avaliacao.js";

const f1 = (n) => (n === null || n === undefined || isNaN(n) ? "—" : Number(n).toFixed(1).replace(".", ","));
const faixaTxt = (n) => { const f = faixaDaNota(n); return f ? f.nome.toLowerCase() : ""; };
const nivel = (n) => (n >= 9 ? "excelente" : n >= 7 ? "bom" : n >= 5 ? "em desenvolvimento" : "insuficiente");
const lista = (xs) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);

// Etapa 1 · Escrituração. Entrada: números da tela Notas.
export function parecerEtapa1(d) {
  const { completudePct, autonomiaPct, qual, qualidadeNota, rodadas, dias, desconto, notaFinal, prazoTxt } = d;
  const P = [];
  if (completudePct === null || completudePct === undefined) P.push("Ainda não há dados suficientes do ciclo para avaliar a completude.");
  else if (completudePct >= 100) P.push("O aluno concluiu todas as notas do ciclo (digitação, análise fiscal, classificação e lançamento aprovado): completude de 100%.");
  else P.push("O aluno concluiu " + completudePct + "% do ciclo; as demais notas ficaram sem digitação, análise, classificação ou lançamento aprovado.");

  const partes = [];
  if (qual && qual.natureza) partes.push("natureza devedora/credora correta em " + qual.natureza.pct + "% das partidas");
  if (qual && qual.competencia) partes.push("competência correta em " + qual.competencia.pct + "% dos lançamentos");
  if (qual && qual.fiscal) partes.push("tratamento registrado em " + qual.fiscal.pct + "% das notas com aviso fiscal");
  if (partes.length) {
    const q = qualidadeNota;
    P.push("Qualidade técnica" + (q !== null && q !== undefined && q !== "" ? " (" + f1(Number(q)) + ")" : "") + ": " + lista(partes) + ".");
    const fracos = [];
    if (qual.natureza && qual.natureza.pct < 90) fracos.push("natureza das contas");
    if (qual.competencia && qual.competencia.pct < 90) fracos.push("competência dos lançamentos");
    if (qual.fiscal && qual.fiscal.pct < 90) fracos.push("tratamento fiscal");
    if (fracos.length) P.push("Pontos a melhorar: " + lista(fracos) + ".");
  }

  if (autonomiaPct !== null && autonomiaPct !== undefined) {
    P.push("Autonomia de " + autonomiaPct + "%" + (rodadas > 0 ? ": os lançamentos tiveram " + rodadas + " devolução(ões) para correção." : ": praticamente nada precisou ser devolvido para correção."));
  }
  if (dias > 0) P.push("A entrega ocorreu " + dias + " dia(s) depois do prazo" + (prazoTxt ? " (" + prazoTxt + ")" : "") + ", com desconto de " + f1(desconto) + " ponto(s)."
    + (notaFinal !== null && notaFinal !== undefined ? " Sem o atraso, a nota seria " + f1(Math.min(10, notaFinal + (Number(desconto) || 0))) + "." : ""));
  else P.push("Entrega dentro do prazo, sem desconto.");
  if (notaFinal !== null && notaFinal !== undefined) P.push("Nota final: " + f1(notaFinal) + " (" + faixaTxt(notaFinal) + ").");
  return P.join("\n\n");
}

// Etapas com critérios (folha, CA, rescisão, AGB, comparativa).
// valores: { chave: nota|null }; comentarios: { chave: texto }
export function parecerEtapaCriterios({ etapa, valores, comentarios, notaCrit, desconto, nota, atrasado }) {
  const P = [];
  const cs = etapa.criterios;
  const faltam = cs.filter((c) => valores[c.key] === null || valores[c.key] === undefined);
  const fortes = cs.filter((c) => valores[c.key] >= 8);
  const fracos = cs.filter((c) => valores[c.key] !== null && valores[c.key] !== undefined && valores[c.key] < 7);
  const meio = cs.filter((c) => valores[c.key] >= 7 && valores[c.key] < 8);
  P.push("Etapa \"" + etapa.titulo + "\": a nota pelos critérios é " + f1(notaCrit) + (notaCrit !== null ? " (" + faixaTxt(notaCrit) + ")." : "."));
  const det = cs.filter((c) => valores[c.key] !== null && valores[c.key] !== undefined)
    .map((c) => c.nome.replace(/\s*\(.*\)\s*$/, "") + " " + f1(valores[c.key]) + " (" + nivel(valores[c.key]) + ")");
  if (det.length) P.push("Por critério: " + det.join("; ") + ".");
  if (fortes.length) P.push("Pontos fortes: " + lista(fortes.map((c) => c.nome.replace(/\s*\(.*\)\s*$/, "").toLowerCase())) + ".");
  if (meio.length && !fracos.length) P.push("Resultado bom, com ajustes pontuais em: " + lista(meio.map((c) => c.nome.replace(/\s*\(.*\)\s*$/, "").toLowerCase())) + ".");
  if (fracos.length) {
    P.push("A melhorar: " + lista(fracos.map((c) => {
      const t = c.nome.replace(/\s*\(.*\)\s*$/, "").toLowerCase();
      const cm = (comentarios && comentarios[c.key] || "").trim();
      return cm ? t + " (" + cm + ")" : t;
    })) + ".");
  }
  if (faltam.length) P.push("Ainda sem nota (avaliação do professor): " + lista(faltam.map((c) => c.nome.replace(/\s*\(.*\)\s*$/, "").toLowerCase())) + ".");
  if (desconto > 0) P.push(atrasado ? "A entrega foi feita depois do prazo, com desconto de " + f1(desconto) + " ponto(s)." : "Foi aplicado desconto de " + f1(desconto) + " ponto(s).");
  else if (atrasado === false) P.push("Entrega dentro do prazo, sem desconto.");
  if (nota !== null && nota !== undefined) P.push("Nota da etapa: " + f1(nota) + " (" + faixaTxt(nota) + ").");
  return P.join("\n\n");
}

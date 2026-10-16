// Sala de aula do professor (2026-10-16). Funções puras: juntam o que os alunos já gravaram e dizem quem precisa do professor agora.
// Só LEITURA: nada aqui grava no Firestore e nada altera o que o aluno digitou.
import { conferirAluno } from "./conferenciaFila.js";
import { fmtNumero } from "./chamados.js";

const CAMPOS_DATA = ["atualizadoEm", "enviadoEm", "aprovadoEm", "salvoEm", "criadoEm", "em"];
export const LIMITES_PARADO = [10, 15, 30]; // minutos
export const LIMITE_PADRAO = 15;

export function ms(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : 0; }
  if (v instanceof Date) return v.getTime();
  return 0;
}
export function ultimaData(obj) {
  let m = 0;
  for (const k of CAMPOS_DATA) m = Math.max(m, ms(obj && obj[k]));
  for (const h of (obj && obj.historicoCorrecoes) || []) m = Math.max(m, ms(h && h.em));
  return m;
}
export function haQuanto(t, agora) {
  if (!t) return "nenhuma ainda";
  const min = Math.max(0, Math.floor((agora - t) / 60000));
  if (min < 1) return "agora mesmo";
  if (min < 60) return "há " + min + " min";
  const h = Math.floor(min / 60);
  if (h < 24) return "há " + h + " h";
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : "há " + d + " dias";
}
const mesmoDia = (a, b) => { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); };

// Chamado do aluno que ainda espera o professor (a resposta automática "Recebi seu chamado" não conta).
export function chamadoAguardando(c) {
  if (!c || c.status === "resolvido") return false;
  if (c.tipo === "pendenciaProfessor" || c.iniciadoPor === "professor") return false;
  const msgs = (c.mensagens || []).filter((m) => m.autor === "aluno" || m.autor === "professor");
  const ult = msgs[msgs.length - 1];
  if (!ult || ult.autor === "aluno") return true;
  return String(ult.texto || "").trim().startsWith("Recebi seu chamado");
}

// Em que passo da Etapa 1 o aluno está (pelo que já gravou).
function passoEtapa1(r, total) {
  if (total > 0 && r.apr >= total) return "Etapa 1 concluída";
  if (r.ras + r.env + r.apr + r.cor > 0) return "Etapa 1 · Livro diário";
  if (r.cla > 0) return "Etapa 1 · Classificação";
  if (r.ana > 0) return "Etapa 1 · Análise fiscal";
  if (r.dig > 0) return "Etapa 1 · Digitação";
  return "";
}

// dados = { aluno, dig, ana, cla, lancs, todosLancs, chamados, caTrab, agbTrab, catalogo, totalNotas }
export function resumirAluno(d, agora, limiteMin) {
  const dig = d.dig || [], ana = d.ana || [], cla = d.cla || [], lancs = d.lancs || [];
  const porStatus = (st) => new Set(lancs.filter((l) => l.status === st).map((l) => l.documento || l.id)).size;
  const r = {
    dig: new Set(dig.map((x) => x.id)).size,
    ana: new Set(ana.filter((x) => x.status === "enviado").map((x) => x.id)).size,
    cla: new Set(cla.map((c) => c.documento || c.id)).size,
    ras: porStatus("rascunho"), env: porStatus("enviado"), apr: porStatus("aprovado"), cor: porStatus("correcao"),
  };
  let ultima1 = 0;
  [...dig, ...ana, ...cla, ...lancs].forEach((x) => { ultima1 = Math.max(ultima1, ultimaData(x)); });
  const ultimaCa = ms(d.caTrab && d.caTrab.atualizadoEm), ultimaAgb = ms(d.agbTrab && d.agbTrab.atualizadoEm);
  const ultima = Math.max(ultima1, ultimaCa, ultimaAgb);
  const total = d.totalNotas || 0;

  // etapa em que está
  let etapa = passoEtapa1(r, total);
  if ((!etapa || etapa === "Etapa 1 concluída") && ultima > 0) {
    if (ultimaAgb >= ultimaCa && ultimaAgb > ultima1) etapa = "Etapas 5–6 · AGB";
    else if (ultimaCa > ultima1) etapa = "Etapas 2–4 · CA";
  }
  if (!etapa) etapa = "Etapa 1 · nenhuma gravação ainda";
  const concluido = etapa === "Etapa 1 concluída" && ultima1 >= Math.max(ultimaCa, ultimaAgb);

  // conferência automática dos lançamentos enviados
  const enviados = lancs.filter((l) => l.status === "enviado");
  let nOk = 0, nNo = 0; const erros = [];
  if (enviados.length && d.catalogo) {
    const res = conferirAluno(enviados, d.todosLancs || lancs, d.catalogo);
    enviados.forEach((l) => {
      const x = res[l.id];
      if (!x) return;
      if (x.estado === "ok") nOk++;
      else if (x.estado === "no") { nNo++; erros.push({ doc: l.documento, motivo: x.motivo, acao: x.acao || "" }); }
    });
  }

  const meusChamados = (d.chamados || []).filter((c) => (c.matricula === d.aluno.matricula || c.alunoMatricula === d.aluno.matricula) && chamadoAguardando(c));
  const sinais = [];
  if (nNo > 0) sinais.push({ tom: "r", alvo: "fila", texto: "❌ " + nNo + (nNo === 1 ? " erro" : " erros") + " na conferência" });
  if (meusChamados.length) {
    const c = meusChamados[0];
    sinais.push({ tom: "a", alvo: "suporte", chamadoId: c.id, texto: "✉ Pediu ajuda" + (c.numero ? " (chamado " + fmtNumero(c.numero) + ")" : "") });
  }
  if (r.env > 0) sinais.push({ tom: nNo === 0 && nOk === r.env ? "g" : "a", alvo: "fila", texto: nNo === 0 && nOk === r.env ? "✅ " + r.env + (r.env === 1 ? " enviado confere" : " enviados conferem") : "⏳ " + r.env + (r.env === 1 ? " enviado" : " enviados") });
  // devolvido e ainda não corrigido = tarefa do ALUNO: não conta como "precisa de você" (tom neutro)
  if (r.cor > 0) sinais.push({ tom: "c", alvo: "historico", texto: "↩ " + r.cor + (r.cor === 1 ? " devolvido, ainda não corrigiu" : " devolvidos, ainda não corrigiu") });

  const precisa = sinais.some((s) => s.tom === "r" || (s.tom === "a"));
  const semHoje = !ultima || !mesmoDia(ultima, agora);
  const parado = !concluido && !precisa && (semHoje || agora - ultima > limiteMin * 60000);
  if (!precisa && !concluido) {
    if (!ultima) sinais.push({ tom: "c", alvo: "historico", texto: "💤 ainda não começou" });
    else if (semHoje) sinais.push({ tom: "c", alvo: "historico", texto: "💤 sem atividade hoje" });
    else if (parado) sinais.push({ tom: "c", alvo: "historico", texto: "💤 parado há " + Math.floor((agora - ultima) / 60000) + " min" });
  }
  if (concluido && !sinais.length) sinais.push({ tom: "g", alvo: "historico", texto: "✅ tudo aprovado" });
  if (!sinais.length) sinais.push({ tom: "g", alvo: "historico", texto: "✅ trabalhando" });

  const grupo = concluido && !precisa ? "ok" : precisa ? "pre" : parado ? "par" : "tra";
  const semaforo = sinais.some((s) => s.tom === "r") ? "r" : grupo === "pre" ? "a" : grupo === "par" ? "c" : "g";
  const nR = sinais.filter((s) => s.tom === "r").length;
  const prioridade = (grupo === "pre" ? 0 : grupo === "par" ? 1 : grupo === "tra" ? 2 : 3) * 10 + (nR ? 0 : 5);
  return {
    aluno: d.aluno, grupo, semaforo, sinais, etapa, ultima, prioridade, concluido,
    prog: { dig: r.dig, ana: r.ana, cla: r.cla, lan: r.ras + r.env + r.apr + r.cor, apr: r.apr }, total,
    erros, devolvidos: r.cor, enviados: r.env, nOk, nNo,
    chamado: meusChamados[0] || null,
    idle: ultima ? Math.floor((agora - ultima) / 60000) : Infinity,
  };
}

export function montarSala(entrada, agora, limiteMin) {
  const { alunos, porAluno, lancsPorAluno, chamados, catalogo, totalNotas } = entrada;
  const linhas = (alunos || []).map((a) => {
    const p = (porAluno && porAluno[a.matricula]) || {};
    const l = (lancsPorAluno && lancsPorAluno[a.matricula]) || [];
    return resumirAluno({ aluno: a, dig: p.dig, ana: p.ana, cla: p.cla, caTrab: p.caTrab, agbTrab: p.agbTrab, lancs: l, todosLancs: l, chamados, catalogo, totalNotas }, agora, limiteMin);
  });
  linhas.sort((x, y) => x.prioridade - y.prioridade || (y.idle === Infinity ? 1 : 0) - (x.idle === Infinity ? 1 : 0) || y.idle - x.idle || (x.aluno.nome || "").localeCompare(y.aluno.nome || ""));
  const cont = { pre: 0, par: 0, tra: 0, ok: 0, all: linhas.length };
  linhas.forEach((x) => { cont[x.grupo]++; });
  return { linhas, cont };
}

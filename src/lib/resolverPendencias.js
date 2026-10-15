// Resolução assistida das pendências do professor (2026-10-15). Funções puras (sem Firestore):
// leem o texto do chamado "Pendência do professor", descobrem o tipo de cada item e sugerem o que fazer.
// Nada aqui grava; quem grava é components/professor/ResolverPendencias.jsx, sempre com confirmação do professor.

export const TIPOS_PEND = {
  classificacao: { rotulo: "CLASSIFICAÇÃO DUPLICADA", re: /classifica[cç][oõ]es? para a mesma nota/i },
  lancdup: { rotulo: "LANÇAMENTO DUPLICADO", re: /lan[cç]amento duplicado/i },
  diverg: { rotulo: "DIVERGÊNCIA", re: /diverg[eê]ncia no lan[cç]amento/i },
};

export function tipoDoTitulo(titulo) {
  for (const [k, v] of Object.entries(TIPOS_PEND)) if (v.re.test(titulo || "")) return k;
  return null;
}

// "1) Nº 306985 — Duas classificações para a mesma nota (2)"  ->  { num:"306985", titulo:"...", tipo:"classificacao", chave:"306985|classificacao" }
export function parseItens(texto) {
  const itens = [];
  String(texto || "").split("\n").forEach((l) => {
    const m = /^\s*\d+\)\s*N[ºo°]?\s*([^\s—-]+)\s*[—-]\s*(.+?)\s*$/.exec(l);
    if (!m) return;
    const tipo = tipoDoTitulo(m[2]);
    itens.push({ num: m[1], titulo: m[2], tipo, chave: m[1] + "|" + (tipo || "outro") });
  });
  return itens;
}

const ms = (x) => (x && x.toMillis ? x.toMillis() : typeof x === "number" ? x : 0);

// Classificações da mesma nota: mantém a que já virou lançamento ("lançada"); se nenhuma ou várias, a mais antiga.
export function sugerirClassificacao(lista) {
  const ord = [...lista].sort((a, b) => ms(a.criadoEm) - ms(b.criadoEm));
  const lancadas = ord.filter((c) => c.status === "lançada");
  const manter = lancadas.length === 1 ? lancadas[0] : (lancadas[0] || ord[0]);
  const motivo = lancadas.length === 1
    ? "a que mantém já virou lançamento; a(s) outra(s) não foi(ram) usada(s)"
    : lancadas.length > 1 ? "mais de uma já virou lançamento: mantive a mais antiga; confira" : "nenhuma virou lançamento ainda: mantive a mais antiga";
  return { manterId: manter ? manter.id : null, motivo, incerto: lancadas.length !== 1 };
}

// Lançamentos repetidos: usa o resultado de conferirAluno (lib/conferenciaFila.js): motivo começa com "duplicado".
export function candidatosDuplicado(lancamentos, resultado) {
  return lancamentos.filter((l) => /^duplicado/i.test((resultado[l.id] || {}).motivo || ""));
}
export function candidatosDivergente(lancamentos, resultado) {
  return lancamentos.filter((l) => (resultado[l.id] || {}).estado === "no" && !/^duplicado/i.test((resultado[l.id] || {}).motivo || ""));
}

export function orientacaoDuplicado(num) {
  return "Este lançamento está repetido (NF " + num + "). Já existe outro igual. Exclua este e não envie de novo.";
}
export function orientacaoDivergencia(r) {
  return ["Motivo: " + (r.motivo || "diferença em relação à nota") + ".", r.acao ? "O que fazer: " + r.acao : ""].filter(Boolean).join(" ");
}

// Cronograma das 6 etapas (2026-10-12). Só CALCULA e DESENHA: não lê nem grava nada no Firestore.
// Os prazos vêm de "Etapas e prazos" (lib/roteiro.js). O mesmo desenho (SVG) serve para a tela, para o PDF (impressão)
// e para a imagem PNG, por isso as cores são fixas (folha clara) e as fontes são as do sistema.

export const INICIO_PROJETO = "2026-09-28"; // a etapa 1 começou na semana de 28/09
const DIA = 86400000;
const toD = (iso) => new Date(iso + "T12:00:00Z");
const toISO = (d) => d.toISOString().slice(0, 10);
const brD = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) : "—");
const brDA = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);

export function hojeISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
export const diasEntre = (aISO, bISO) => Math.round((toD(bISO) - toD(aISO)) / DIA);
// Feriados sem aula no período do projeto (plano de 12/10 a 04/12/2026): não contam como dia útil.
export const FERIADOS_PROJETO = ["2026-10-12", "2026-10-15", "2026-11-02", "2026-11-20"];
export function proximoDiaUtil(iso) {
  let d = new Date(toD(iso).getTime() + DIA);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || FERIADOS_PROJETO.includes(toISO(d))) d = new Date(d.getTime() + DIA);
  return toISO(d);
}

// Início de cada etapa = primeiro dia útil depois do prazo da etapa anterior. A etapa 1 começa em INICIO_PROJETO.
// etapas: [{ id, n, titulo, disc, prazo, aulas, entrega, hachurada, nota, sit:{texto,tom} }]
export function linhasCronograma(etapas) {
  let ultimoFim = "";
  return etapas.map((e, i) => {
    const fim = e.prazo || "";
    let ini = "";
    if (fim) {
      ini = i === 0 || !ultimoFim ? (i === 0 ? INICIO_PROJETO : fim) : proximoDiaUtil(ultimoFim);
      if (ini > fim) ini = fim;
      ultimoFim = fim;
    }
    return { ...e, ini, fim };
  });
}

const COR = { CI: "#1F5A43", CA: "#C98A1B", AGB: "#3C6A8C" };
const TOM = {
  and: ["#FBEFD0", "#7A5208"], ok: ["#DCEBE3", "#1F5A43"], info: ["#DCE8F1", "#2C5573"],
  bad: ["#F6D9D3", "#8E2F20"], blq: ["#E9E8E2", "#5E635D"],
};
const INK = "#1D2B24", SOFT = "#5B665F", LINE = "#D9D5C7", GRID = "#E8E5DA", HOJE_COR = "#B3412E";
const SANS = "'Segoe UI', Helvetica, Arial, sans-serif", SERIF = "Georgia, 'Times New Roman', serif", MONO = "Consolas, 'Courier New', monospace";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function quebrar(texto, max) {
  const palavras = String(texto || "").split(" ").filter(Boolean);
  const out = [];
  let atual = "";
  palavras.forEach((p) => {
    if (atual && (atual + " " + p).length > max) { out.push(atual); atual = p; } else atual = atual ? atual + " " + p : p;
  });
  if (atual) out.push(atual);
  if (out.length > 2) { const dois = out.slice(0, 2); dois[1] = dois[1].replace(/\s*\S*$/, "") + "…"; return dois; }
  return out;
}

// opcoes: { linhas, titulo, meta:[l1,l2], aqui, colunaSituacao, hoje(ISO), emitidoEm(ISO), rodapeEsq }
export function montarSvgCronograma(op) {
  const linhas = op.linhas || [];
  const n = linhas.length;
  const W = 1100, M = 28, LAB = 250, CW = W - LAB - M;
  const TOP = 182, RH = 56;
  const validas = linhas.filter((l) => l.ini && l.fim);
  // eixo: semanas (segunda a domingo) que cobrem todas as barras
  let minD = INICIO_PROJETO, maxD = INICIO_PROJETO;
  if (validas.length) { minD = validas.reduce((m, l) => (l.ini < m ? l.ini : m), validas[0].ini); maxD = validas.reduce((m, l) => (l.fim > m ? l.fim : m), validas[0].fim); }
  let ini = toD(minD);
  while (ini.getUTCDay() !== 1) ini = new Date(ini.getTime() - DIA);
  const semanas = Math.max(4, Math.ceil((toD(maxD) - ini) / DIA / 7 + 0.15));
  const total = semanas * 7;
  const iniISO = toISO(ini);
  const xDe = (iso, fimDoDia) => LAB + ((diasEntre(iniISO, iso) + (fimDoDia ? 1 : 0)) / total) * CW;

  const yChartFim = TOP + RH * n;
  const yLeg = yChartFim + 44;
  const yTab = yLeg + 36;
  const TH = 42;
  const H = yTab + 28 + TH * n + 44;

  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(op.titulo) + '">';
  s += '<defs><pattern id="hach" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#E9E8E2"/><rect width="2" height="7" fill="#8A8F88" opacity=".6"/></pattern></defs>';
  s += '<rect width="' + W + '" height="' + H + '" fill="#FFFFFF"/>';

  // cabeçalho
  s += '<text x="' + M + '" y="38" font-family="' + MONO + '" font-size="11.5" letter-spacing="1.2" fill="' + SOFT + '">PROJETO INTERDISCIPLINAR CI–CA–AGB</text>';
  s += '<text x="' + M + '" y="70" font-family="' + SERIF + '" font-size="26" font-weight="700" fill="' + INK + '">' + esc(op.titulo) + "</text>";
  (op.meta || []).forEach((t, i) => { s += '<text x="' + (W - M) + '" y="' + (38 + i * 20) + '" text-anchor="end" font-family="' + SANS + '" font-size="13.5" fill="' + (i === 0 ? INK : SOFT) + '">' + esc(t) + "</text>"; });
  s += '<line x1="' + M + '" x2="' + (W - M) + '" y1="86" y2="86" stroke="' + INK + '" stroke-width="2"/>';
  if (op.aqui) {
    s += '<rect x="' + M + '" y="100" width="' + (W - 2 * M) + '" height="36" rx="5" fill="#DCEBE3"/>';
    s += '<text x="' + (M + 14) + '" y="123" font-family="' + SANS + '" font-size="14" fill="' + INK + '">' + esc(op.aqui) + "</text>";
  }

  // semanas
  s += '<text x="' + LAB + '" y="' + (TOP - 28) + '" font-family="' + MONO + '" font-size="10.5" letter-spacing="1" fill="' + SOFT + '">SEMANAS (DATA DA SEGUNDA-FEIRA)</text>';
  for (let k = 0; k < semanas; k++) {
    const xd = LAB + (k * 7 / total) * CW, w = (7 / total) * CW;
    const dt = toISO(new Date(ini.getTime() + k * 7 * DIA));
    if (k % 2 === 0) s += '<rect x="' + xd.toFixed(1) + '" y="' + TOP + '" width="' + w.toFixed(1) + '" height="' + RH * n + '" fill="' + GRID + '" opacity=".5"/>';
    s += '<text x="' + (xd + 4).toFixed(1) + '" y="' + (TOP - 10) + '" font-family="' + MONO + '" font-size="11.5" fill="' + SOFT + '">' + brD(dt) + "</text>";
  }

  // linhas e barras
  linhas.forEach((l, i) => {
    const y = TOP + i * RH;
    s += '<line x1="' + M + '" x2="' + (W - M) + '" y1="' + (y + RH) + '" y2="' + (y + RH) + '" stroke="' + LINE + '"/>';
    s += '<text x="' + M + '" y="' + (y + 19) + '" font-family="' + MONO + '" font-size="11.5" fill="' + SOFT + '">' + l.n + " · " + esc(l.disc) + "</text>";
    quebrar(l.titulo, 27).forEach((t, k) => { s += '<text x="' + M + '" y="' + (y + 37 + k * 15) + '" font-family="' + SANS + '" font-size="13.5" font-weight="600" fill="' + INK + '">' + esc(t) + "</text>"; });
    if (!l.ini || !l.fim) { s += '<text x="' + (LAB + 8) + '" y="' + (y + 33) + '" font-family="' + SANS + '" font-size="13" font-style="italic" fill="' + SOFT + '">sem prazo definido</text>'; return; }
    const a = xDe(l.ini, false), b = xDe(l.fim, true);
    const cor = COR[l.disc] || COR.CI;
    s += '<rect x="' + a.toFixed(1) + '" y="' + (y + 12) + '" width="' + Math.max(b - a, 4).toFixed(1) + '" height="32" rx="4" fill="' + (l.hachurada ? "url(#hach)" : cor) + '"' + (l.hachurada ? ' stroke="#8A8F88"' : "") + "/>";
    if (b - a > 122) s += '<text x="' + ((a + b) / 2).toFixed(1) + '" y="' + (y + 32) + '" text-anchor="middle" font-family="' + MONO + '" font-size="12" font-weight="bold" fill="' + (l.hachurada ? "#5E635D" : l.disc === "CA" ? "#1D1A0E" : "#FFFFFF") + '">' + brD(l.ini) + " → " + brD(l.fim) + "</text>";
    s += '<path d="M' + b.toFixed(1) + " " + (y + 5) + ' l5.5 5.5 l-5.5 5.5 l-5.5 -5.5 z" fill="' + INK + '"/>';
    if (l.nota) {
      const cabeDireita = b + 14 + l.nota.length * 6.4 < W - M;
      s += '<text x="' + (cabeDireita ? b + 14 : a - 10).toFixed(1) + '" y="' + (y + 32) + '"' + (cabeDireita ? "" : ' text-anchor="end"') + ' font-family="' + SANS + '" font-size="12.5" fill="' + SOFT + '">' + esc(l.nota) + "</text>";
    }
  });

  // hoje
  if (op.hoje && op.hoje >= iniISO && diasEntre(iniISO, op.hoje) < total) {
    const xh = xDe(op.hoje, false) + CW / total / 2;
    s += '<line x1="' + xh.toFixed(1) + '" x2="' + xh.toFixed(1) + '" y1="' + (TOP - 4) + '" y2="' + yChartFim + '" stroke="' + HOJE_COR + '" stroke-width="2"/>';
    s += '<rect x="' + (xh - 27).toFixed(1) + '" y="' + yChartFim + '" width="54" height="16" rx="3" fill="' + HOJE_COR + '"/><text x="' + xh.toFixed(1) + '" y="' + (yChartFim + 12) + '" text-anchor="middle" font-family="' + MONO + '" font-size="10.5" font-weight="bold" fill="#FFFFFF">HOJE</text>';
  }

  // legenda
  let lx = M;
  [["CI · Contabilidade Intermediária", COR.CI], ["CA · Contabilidade Avançada", COR.CA], ["AGB · Análise Gerencial de Balanços", COR.AGB]].forEach(([t, c]) => {
    s += '<rect x="' + lx + '" y="' + (yLeg - 10) + '" width="14" height="10" rx="2" fill="' + c + '"/><text x="' + (lx + 20) + '" y="' + (yLeg - 1) + '" font-family="' + SANS + '" font-size="12.5" fill="' + SOFT + '">' + esc(t) + "</text>";
    lx += 20 + t.length * 6.6 + 22;
  });
  if (linhas.some((l) => l.hachurada)) {
    s += '<rect x="' + lx + '" y="' + (yLeg - 10) + '" width="14" height="10" rx="2" fill="url(#hach)" stroke="#8A8F88"/><text x="' + (lx + 20) + '" y="' + (yLeg - 1) + '" font-family="' + SANS + '" font-size="12.5" fill="' + SOFT + '">Etapa ainda não liberada</text>';
  }

  // tabela
  const cx = { n: M, et: M + 28, per: 372, prazo: 478, aulas: 576, ent: 600, sit: 905 };
  s += '<line x1="' + M + '" x2="' + (W - M) + '" y1="' + (yTab + 6) + '" y2="' + (yTab + 6) + '" stroke="' + INK + '"/>';
  [["#", cx.n, ""], ["ETAPA", cx.et, ""], ["PERÍODO", cx.per, ""], ["PRAZO", cx.prazo, ""], ["AULAS", cx.aulas + 4, "end"], ["O QUE ENTREGAR", cx.ent, ""], [(op.colunaSituacao || "SITUAÇÃO").toUpperCase(), cx.sit, ""]].forEach(([t, x, anc]) => {
    s += '<text x="' + x + '" y="' + (yTab - 6) + '"' + (anc ? ' text-anchor="end"' : "") + ' font-family="' + MONO + '" font-size="10.5" letter-spacing=".8" fill="' + SOFT + '">' + esc(t) + "</text>";
  });
  linhas.forEach((l, i) => {
    const y = yTab + 6 + i * TH;
    s += '<line x1="' + M + '" x2="' + (W - M) + '" y1="' + (y + TH) + '" y2="' + (y + TH) + '" stroke="' + LINE + '"/>';
    const ty = y + 25;
    s += '<text x="' + cx.n + '" y="' + ty + '" font-family="' + MONO + '" font-size="12.5" fill="' + SOFT + '">' + l.n + "</text>";
    s += '<text x="' + cx.et + '" y="' + ty + '" font-family="' + SANS + '" font-size="13.5" fill="' + INK + '">' + esc(l.titulo.length > 38 ? l.titulo.slice(0, 37) + "…" : l.titulo) + '<tspan dx="7" font-family="' + MONO + '" font-size="11" font-weight="bold" fill="' + (COR[l.disc] || COR.CI) + '">' + esc(l.disc) + "</tspan></text>";
    s += '<text x="' + cx.per + '" y="' + ty + '" font-family="' + MONO + '" font-size="12.5" fill="' + INK + '">' + (l.ini ? brD(l.ini) + " a " + brD(l.fim) : "—") + "</text>";
    s += '<text x="' + cx.prazo + '" y="' + ty + '" font-family="' + MONO + '" font-size="12.5" font-weight="bold" fill="' + INK + '">' + brD(l.fim) + "</text>";
    s += '<text x="' + (cx.aulas + 4) + '" y="' + ty + '" text-anchor="end" font-family="' + SANS + '" font-size="13" fill="' + INK + '">' + (l.aulas != null ? l.aulas : "—") + "</text>";
    const ent = quebrar(l.entrega, 44);
    ent.forEach((t, k) => { s += '<text x="' + cx.ent + '" y="' + (ent.length > 1 ? y + 19 + k * 15 : ty) + '" font-family="' + SANS + '" font-size="12.5" fill="' + INK + '">' + esc(t) + "</text>"; });
    if (l.sit && l.sit.texto) {
      const [bg, fg] = TOM[l.sit.tom] || TOM.blq;
      const tw = Math.min(l.sit.texto.length * 6.7 + 20, W - M - cx.sit);
      s += '<rect x="' + cx.sit + '" y="' + (y + 10) + '" width="' + tw.toFixed(1) + '" height="22" rx="11" fill="' + bg + '"/><text x="' + (cx.sit + 10) + '" y="' + (y + 25) + '" font-family="' + SANS + '" font-size="12" font-weight="bold" fill="' + fg + '">' + esc(l.sit.texto) + "</text>";
    }
  });

  // rodapé
  const yR = H - 16;
  s += '<text x="' + M + '" y="' + yR + '" font-family="' + SANS + '" font-size="11.5" fill="' + SOFT + '">Emitido em ' + brDA(op.emitidoEm || hojeISO()) + " · prazos conforme “Etapas e prazos”</text>";
  s += '<text x="' + (W - M) + '" y="' + yR + '" text-anchor="end" font-family="' + SANS + '" font-size="11.5" fill="' + SOFT + '">CEDUP Hermann Hering</text>';
  s += "</svg>";
  return { svg: s, W, H };
}

// Texto da faixa "você está aqui" (aluno) e "próximo prazo" (professor)
export function textoProximoPrazo(linhas, hoje) {
  const l = linhas.find((x) => x.fim && x.fim >= hoje);
  if (!l) return "Todos os prazos das etapas já passaram.";
  const d = diasEntre(hoje, l.fim);
  return "Próximo prazo: " + brD(l.fim) + " · etapa " + l.n + " (" + l.titulo + ") · " + (d === 0 ? "vence hoje." : d === 1 ? "falta 1 dia." : "faltam " + d + " dias.");
}
export function textoVoceEstaAqui(linha, total, hoje) {
  if (!linha) return "Todas as etapas foram aprovadas. Parabéns!";
  let t = "Você está aqui: etapa " + linha.n + " de " + total + " · " + linha.titulo;
  if (linha.fim) {
    const d = diasEntre(hoje, linha.fim);
    t += " · prazo " + brD(linha.fim) + " · " + (d < 0 ? "prazo vencido há " + (-d) + (d === -1 ? " dia." : " dias.") : d === 0 ? "vence hoje." : d === 1 ? "falta 1 dia." : "faltam " + d + " dias.");
  }
  return t;
}
export const nomeArquivoCronograma = (quem, iso) => "cronograma-" + String(quem || "projeto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + iso + ".png";

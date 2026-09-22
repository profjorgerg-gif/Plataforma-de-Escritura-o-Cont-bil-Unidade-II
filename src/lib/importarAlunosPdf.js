// Importação de lista de alunos via PDF — mesma lógica testada no
// protótipo contra o PDF real da escola (Professor On-line / SED-SC), que
// renderiza cada linha com texto duplicado sobreposto (efeito de negrito
// falso). Aqui usamos pdfjs-dist como dependência real do projeto (Vite
// resolve o worker via import.meta.url) em vez do import dinâmico de CDN
// que o protótipo usava — mais robusto para um build de produção.

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extrairLinhasPdf(file) {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const linhas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const porY = {};
    content.items.forEach((it) => {
      const y = Math.round(it.transform[5] / 3) * 3;
      (porY[y] = porY[y] || []).push(it);
    });
    Object.keys(porY).map(Number).sort((a, b) => b - a).forEach((y) => {
      const ordenados = porY[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const partes = [];
      ordenados.forEach((it) => {
        const s = it.str;
        if (!s.trim()) return;
        // descarta texto duplicado sobreposto (efeito de negrito falso comum em impressão web→PDF)
        if (partes.length && partes[partes.length - 1] === s) return;
        partes.push(s);
      });
      const linha = partes.join(" ").replace(/\s+/g, " ").trim();
      if (linha) linhas.push(linha);
    });
  }
  return linhas;
}

function undoubleToken(tok) {
  const n = tok.length;
  if (n < 2 || n % 2 !== 0) return tok;
  for (let i = 0; i < n; i += 2) { if (tok[i] !== tok[i + 1]) return tok; }
  let out = ""; for (let i = 0; i < n; i += 2) out += tok[i];
  return out;
}
function undoubleLinha(linha) {
  return linha.split(" ").map(undoubleToken).join(" ");
}

export function candidatosDeLinhas(linhas) {
  const candidatos = [];
  const vistas = new Set();
  linhas.forEach((linhaOriginal) => {
    const linha = undoubleLinha(linhaOriginal);
    const mMatricula = linha.match(/\d{6,12}/);
    if (!mMatricula) return;
    if (vistas.has(mMatricula[0])) return;
    let nome = (linha.slice(0, mMatricula.index) + linha.slice(mMatricula.index + mMatricula[0].length))
      .replace(/^\s*\d+/, "")
      .replace(/matr[íi]cula|\bnome( do aluno| completo)?\b|\baluno\b/gi, "")
      .replace(/[:\-|]/g, " ").replace(/\s+/g, " ").trim();
    const palavras = nome.split(" ").filter((w) => /^[A-Za-zÀ-ÿ.']+$/.test(w));
    if (palavras.length < 2) return;
    vistas.add(mMatricula[0]);
    candidatos.push({ nome: palavras.join(" "), matricula: mMatricula[0], incluir: true });
  });
  return candidatos;
}

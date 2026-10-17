// Cabeçalhos das capas dos cadernos impressos (professor). Tudo fica SÓ neste navegador (localStorage); nada vai ao Firestore.
// Dois cabeçalhos criados uma vez: "escola" (imagem + até 5 linhas) e "escrito" (só texto, até 5 linhas).
// Cada caderno escolhe qual usa na capa: "escola" (padrão), "escrito" ou "nenhum". As chaves "caderno.cabecalhoEscola" e
// "caderno.nomeProfessor" são as mesmas que o Caderno do Aluno já usava, então o que já foi preenchido é aproveitado.
export const K_ESCOLA = "caderno.cabecalhoEscola";
export const K_ESCRITO = "caderno.cabecalhoEscrito";
export const K_NOME = "caderno.nomeProfessor";
export const K_ESCOLHA = "caderno.cabEscolha.";
export const CADERNOS_COM_CAPA = [
  { id: "aluno", nome: "Caderno PI" },
  { id: "folha", nome: "Caderno da Folha" },
];
export const ESCOLHAS = [["escola", "🏫 Da escola"], ["escrito", "✍ Escrito"], ["nenhum", "Sem cabeçalho"]];

export function esc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function ler(k) { try { return JSON.parse(window.localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function gravar(k, v) { try { window.localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); return true; } catch (e) { return false; } }

export function lerEscola() { const v = ler(K_ESCOLA); return { linhas: String((v && v.linhas) || ""), logo: String((v && v.logo) || "") }; }
export function gravarEscola(v) { return gravar(K_ESCOLA, { ativo: true, linhas: v.linhas || "", logo: v.logo || "" }); }
export function lerEscrito() { const v = ler(K_ESCRITO); return { linhas: String((v && v.linhas) || "") }; }
export function gravarEscrito(v) { return gravar(K_ESCRITO, { linhas: v.linhas || "" }); }
export function lerEscolha(id) {
  try { const v = window.localStorage.getItem(K_ESCOLHA + id); if (v === "escola" || v === "escrito" || v === "nenhum") return v; } catch (e) { /* sem armazenamento */ }
  return "escola";
}
export function gravarEscolha(id, v) { return gravar(K_ESCOLHA + id, v); }
export function lerNomeProf(padrao) {
  try { const v = window.localStorage.getItem(K_NOME); if (v !== null) return v; } catch (e) { /* sem armazenamento */ }
  return padrao || "";
}
export function gravarNomeProf(v) { return gravar(K_NOME, v); }

// HTML do cabeçalho (só imagem e/ou texto centralizados, com a linha embaixo). "" se não houver nada para mostrar.
export function htmlCabecalho(escolha) {
  if (escolha === "nenhum") return "";
  const c = escolha === "escrito" ? { linhas: lerEscrito().linhas, logo: "" } : lerEscola();
  const linhas = c.linhas.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5);
  if (!linhas.length && !c.logo) return "";
  const img = c.logo ? '<img src="' + esc(c.logo) + '" alt="" style="display:block;margin:0 auto;width:100%;max-height:118px;object-fit:contain">' : "";
  const txt = linhas.map((l, i) => '<div style="' + (i === 0 ? "font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;" : "font-size:12.5px;") + 'line-height:1.35">' + esc(l) + "</div>").join("");
  return '  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;border-bottom:3px solid #1B1F1C;padding-bottom:12px">' + img + (txt ? '<div style="width:100%;text-align:center">' + txt + "</div>" : "") + "</div>\n";
}

// Reduz a imagem escolhida (PNG/JPG) para caber no armazenamento do navegador. Devolve a data URL.
export function prepararImagem(arq) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const f = Math.min(1, 1400 / img.width, 400 / img.height);
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * f)); c.height = Math.max(1, Math.round(img.height * f));
        const g = c.getContext("2d");
        g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        let url = c.toDataURL("image/png");
        if (url.length > 1500000) url = c.toDataURL("image/jpeg", 0.88);
        resolve(url);
      };
      img.onerror = () => reject(new Error("Não consegui abrir essa imagem. Use PNG ou JPG."));
      img.src = String(leitor.result);
    };
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.readAsDataURL(arq);
  });
}

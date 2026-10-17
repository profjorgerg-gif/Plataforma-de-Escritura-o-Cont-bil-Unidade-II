import { useMemo, useRef, useState } from "react";

// Campo de conta com busca por digitação (chamado do aluno, 16/10/2026): digite o código (ex.: 1.1.1.02) ou parte do nome
// (ex.: banco) e escolha na lista. SÓ muda a tela: o valor continua sendo o CÓDIGO da conta (value/onChange iguais ao do <select> antigo).
// Só aceita conta que existe no plano: texto solto não vira conta (o valor fica vazio até escolher).
const LIMITE = 40;

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function SeletorConta({ contas, value, onChange, placeholder = "Digite o código ou o nome da conta", ariaLabel = "Conta", disabled }) {
  const [texto, setTexto] = useState(null); // null = mostrando a conta escolhida; string = digitando
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const fechar = useRef(null);

  const escolhida = useMemo(() => (contas || []).find((c) => c.codigo === value) || null, [contas, value]);
  const rotulo = escolhida ? escolhida.codigo + " — " + escolhida.nome : (value ? String(value) : "");
  const mostrado = texto !== null ? texto : rotulo;

  const lista = useMemo(() => {
    const q = norm(texto === null ? "" : texto).trim();
    const todas = contas || [];
    if (!q) return todas;
    const porCodigo = todas.filter((c) => c.codigo.startsWith(q));
    const resto = todas.filter((c) => !c.codigo.startsWith(q) && (c.codigo.includes(q) || norm(c.nome).includes(q)));
    return porCodigo.concat(resto);
  }, [contas, texto]);
  const visiveis = lista.slice(0, LIMITE);

  function escolher(c) {
    onChange(c.codigo);
    setTexto(null);
    setAberto(false);
  }
  function aoDigitar(e) {
    const t = e.target.value;
    setTexto(t);
    setAberto(true);
    setAtivo(0);
    if (value) onChange(""); // mexeu no texto: a conta anterior deixa de valer até escolher outra
  }
  function aoSair() {
    // digitou o código inteiro? aceita na hora (sem esperar), para não perder a conta se o aluno clicar direto em Salvar/Enviar
    if (texto !== null) {
      const exata = (contas || []).find((c) => c.codigo === texto.trim());
      if (exata) { onChange(exata.codigo); setTexto(null); }
    }
    fechar.current = setTimeout(() => setAberto(false), 120);
  }
  function aoTeclar(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAberto(true); setAtivo((a) => Math.min(a + 1, visiveis.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { if (aberto && visiveis[ativo]) { e.preventDefault(); escolher(visiveis[ativo]); } }
    else if (e.key === "Escape") { setAberto(false); }
  }

  const semConta = texto !== null && texto.trim() !== "" && !value;
  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <input
        type="text" role="combobox" aria-expanded={aberto} aria-autocomplete="list" aria-label={ariaLabel}
        autoComplete="off" disabled={disabled} placeholder={placeholder} value={mostrado}
        style={{ width: "100%", boxSizing: "border-box", ...(escolhida ? { borderColor: "var(--green)" } : null) }}
        onFocus={(e) => { clearTimeout(fechar.current); setAberto(true); setAtivo(0); if (escolhida) e.target.select(); }}
        onChange={aoDigitar} onBlur={aoSair} onKeyDown={aoTeclar}
      />
      {/* linha de aviso com altura fixa: o layout não "pula" quando a conta é aceita (senão o clique no botão ao lado se perde) */}
      <div style={{ fontSize: 11.5, height: 16, lineHeight: "16px", marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: escolhida ? "var(--green)" : "var(--amber)" }}>
        {escolhida && texto === null ? "✓ conta do plano"
          : !escolhida && value && texto === null ? "Esta conta não está no plano. Escolha outra."
          : semConta && !aberto ? "Escolha uma conta da lista." : ""}
      </div>
      {aberto && !disabled && (
        <div role="listbox" style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 30, background: "var(--surface)", border: "1px solid var(--line-strong)", maxHeight: 230, overflowY: "auto", boxShadow: "0 6px 16px rgba(0,0,0,.18)" }}>
          {visiveis.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 13, color: "var(--ink-soft)" }}>{semConta ? "Nenhuma conta do plano combina com o que você digitou." : "Nenhuma conta disponível."}</div>
          ) : visiveis.map((c, i) => (
            <button
              key={c.codigo} type="button" role="option" aria-selected={i === ativo}
              onMouseDown={(e) => { e.preventDefault(); escolher(c); }}
              onMouseEnter={() => setAtivo(i)}
              style={{ display: "block", width: "100%", textAlign: "left", font: "inherit", fontSize: 13.5, background: i === ativo ? "var(--green-pale)" : "none", color: "var(--ink)", border: 0, borderBottom: "1px solid var(--line)", padding: "7px 10px", cursor: "pointer" }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: "var(--blue)", marginRight: 6 }}>{c.codigo}</span>{c.nome}
            </button>
          ))}
          {lista.length > LIMITE && <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--ink-faint)" }}>Mostrando {LIMITE} de {lista.length}. Digite mais para filtrar.</div>}
        </div>
      )}
    </div>
  );
}

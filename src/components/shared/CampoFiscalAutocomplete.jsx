import { useRef, useState } from "react";
import { soDigitos } from "../../hooks/useLookupFiscal.js";

// Campo de CFOP/NCM com lista de sugestões correlacionadas, a partir do
// primeiro número digitado (2026-10-03, pedido do professor) — igual em
// espírito à busca do Plano de Contas, mas puxando da tabela oficial de
// CFOP/NCM. O aluno/professor pode digitar o código de cor e seguir, ou
// parar no meio e escolher na lista; de qualquer forma, a lista só mostra o
// que cada código SIGNIFICA — nunca qual é "o certo" para a nota em questão.
const LIMITE_SUGESTOES = 12;

export default function CampoFiscalAutocomplete({ tipo, value, onChange, dados, placeholder, style }) {
  const [aberto, setAberto] = useState(false);
  const timeoutFechar = useRef(null);

  const bruto = String(value || "").trim();
  const chaveDigitada = tipo === "ncm" ? soDigitos(bruto) : bruto;

  let sugestoes = [];
  let temMais = false;
  if (dados && chaveDigitada.length >= 1) {
    const todas = dados.filter((d) => {
      const chaveItem = tipo === "ncm" ? soDigitos(d.codigo) : String(d.codigo).trim();
      return chaveItem.startsWith(chaveDigitada);
    });
    temMais = todas.length > LIMITE_SUGESTOES;
    sugestoes = todas.slice(0, LIMITE_SUGESTOES);
  }

  function selecionar(codigo) {
    onChange(codigo);
    setAberto(false);
  }

  function aoDesfocar() {
    // pequeno atraso para o clique numa sugestão registrar antes de fechar
    timeoutFechar.current = setTimeout(() => setAberto(false), 180);
  }
  function cancelarFechar() {
    if (timeoutFechar.current) clearTimeout(timeoutFechar.current);
  }

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        className="mono"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={aoDesfocar}
        autoComplete="off"
      />
      {aberto && sugestoes.length > 0 && (
        <div
          onMouseDown={cancelarFechar}
          style={{
            position: "absolute", zIndex: 30, top: "100%", left: 0, minWidth: 320,
            background: "#fff", border: "1px solid var(--line-strong)", boxShadow: "0 10px 24px rgba(20,30,24,0.15)",
            maxHeight: 240, overflowY: "auto", marginTop: 2,
          }}
        >
          {sugestoes.map((d) => (
            <div
              key={d.codigo}
              onClick={() => selecionar(d.codigo)}
              style={{ padding: "7px 10px", fontSize: 12.5, cursor: "pointer", borderBottom: "1px solid var(--line)", lineHeight: 1.4 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--paper-deep)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
            >
              <span className="mono" style={{ fontWeight: 700 }}>{d.codigo}</span> — {tipo === "cfop" ? d.titulo : d.descricao}
            </div>
          ))}
          {temMais && (
            <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--ink-faint)" }}>
              digite mais números para refinar a busca…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

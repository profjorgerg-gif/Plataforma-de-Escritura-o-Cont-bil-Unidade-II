import { useMemo, useState } from "react";
import { casoDoEmpregado, textoDoCaso } from "../../lib/enunciadosCA.js";
import { CAMPOS_EMPREGADO } from "../../lib/folhaAtividade.js";

// Etapa 2: o aluno PEDE o seu caso. O caso é calculado na hora (não é gravado) a partir da matrícula + empregado + mês,
// então é sempre o mesmo. "Usar estes dados" só preenche campos VAZIOS; se já houver algo digitado, pergunta antes.
export default function EnunciadoEmpregado({ matricula, emp, competencia, obs, get, set, automatico }) {
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState("");
  const caso = useMemo(() => casoDoEmpregado(matricula || "", emp.id, competencia), [matricula, emp.id, competencia]);
  const texto = useMemo(() => textoDoCaso(emp.nome, caso, competencia, obs), [emp.nome, caso, competencia, obs]);
  function usar() {
    const preenchidos = CAMPOS_EMPREGADO.filter((c) => String(get(c) || "").trim() !== "");
    if (preenchidos.length && !window.confirm("Esta ficha já tem valores digitados por você. Quer SUBSTITUIR todos pelos dados do enunciado? (Cancelar mantém o que você digitou.)")) { setMsg("Nada foi alterado."); return; }
    CAMPOS_EMPREGADO.forEach((c) => { if (String(get(c) || "") !== String(caso[c] ?? "")) set(c, caso[c] ?? ""); });
    setMsg("Pronto: os campos foram preenchidos com os dados do enunciado. Agora calcule o contracheque.");
  }
  async function copiar() { try { await navigator.clipboard.writeText(texto); setMsg("Enunciado copiado."); } catch { window.prompt("Copie (Ctrl+C):", texto); } }
  return (
    <div className="panel">
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>📄 Enunciado de {emp.nome}</h3>
        <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => { setAberto(!aberto); setMsg(""); }}>{aberto ? "fechar" : (automatico ? "Ver o enunciado" : "Receber meu caso")}</button>
      </div>
      {aberto && (
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>{texto}</p>
          <div className="btn-row">
            {!automatico && <button className="btn" onClick={usar}>Usar estes dados no meu contracheque</button>}
            <button className="btn secondary" onClick={copiar}>Copiar enunciado</button>
          </div>
          {msg && <div className="helper-note" style={{ marginTop: 8 }} role="status">{msg}</div>}
          <div className="helper-note" style={{ marginTop: 8 }}>O resultado (bruto, INSS, IRRF e líquido) não aparece aqui: você calcula e o sistema confere.</div>
        </div>
      )}
    </div>
  );
}

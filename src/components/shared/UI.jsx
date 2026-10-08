import { fmt, PESOS_RUBRICA } from "../../lib/contabil.js";

// Painel "O que será avaliado" — mesma estrutura nos dois lados (professor e
// aluno), só leitura nos dois. A "qualidade técnica" (2026-10-08) deixou de
// ser texto livre escrito pelo professor e passou a ser 100% automática —
// 3 checagens objetivas sobre os lançamentos (não lê nada escrito pelo
// aluno). `qualidade` é o retorno de qualidadeTecnicaAutomatica() em
// contabil.js; passar undefined/null mostra só as descrições, sem números
// (usado na tela do professor, que é por turma, não por aluno).
function subCriterio(nome, desc, resultado) {
  return (
    <div className="sub-criterio">
      <div className="sub-criterio-nome">
        {nome}
        {resultado && <span className="sub-criterio-pct">{resultado.corretas}/{resultado.total} — {resultado.pct}%</span>}
      </div>
      <div className="sub-criterio-desc">{desc}</div>
    </div>
  );
}

export function CriteriosAvaliacao({ turma, qualidade }) {
  return (
    <div className="panel">
      <div className="panel-head"><h3>O que será avaliado — Unidade II</h3></div>
      <div className="panel-body">
        <div className="criterio-avaliacao-row">
          <div className="criterio-avaliacao-peso">{Math.round(PESOS_RUBRICA.completude * 100)}%</div>
          <div>
            <div className="criterio-avaliacao-nome">Completude do ciclo <span className="tag-pill">automático</span></div>
            <div className="criterio-avaliacao-desc">% de documentos liberados com as 4 etapas concluídas: digitação, análise fiscal, classificação e lançamento aprovado.</div>
          </div>
        </div>
        <div className="criterio-avaliacao-row">
          <div className="criterio-avaliacao-peso">{Math.round(PESOS_RUBRICA.qualidade * 100)}%</div>
          <div style={{ flex: 1 }}>
            <div className="criterio-avaliacao-nome">Qualidade técnica <span className="tag-pill">automático — baseado nos lançamentos</span></div>
            <div className="criterio-avaliacao-desc">Calculada a partir de 3 verificações objetivas sobre os seus lançamentos aprovados — nenhuma delas lê o que foi escrito, só confere dados e datas:</div>
            <div className="sub-criterios">
              {subCriterio("Natureza da conta", "Confere se cada conta foi lançada no lado (débito ou crédito) condizente com a natureza dela no Plano de Contas.", qualidade?.natureza)}
              {subCriterio("Regime de competência", "Confere se a data do lançamento está no mesmo mês/ano da emissão do documento de origem.", qualidade?.competencia)}
              {subCriterio("Reação ao aviso fiscal", "Quando a Análise Fiscal aponta CFOP, NCM ou CST incorreto, confere se o campo \"tratamento tributário\" foi preenchido na Classificação daquele documento.", qualidade?.fiscal)}
            </div>
            {qualidade?.notaSugerida !== null && qualidade?.notaSugerida !== undefined && (
              <div className="criterio-avaliacao-desc" style={{ marginTop: 10, fontWeight: 700, color: "var(--green)" }}>
                Nota sugerida desta parte: {fmt(qualidade.notaSugerida)} (média das checagens acima)
              </div>
            )}
          </div>
        </div>
        <div className="criterio-avaliacao-row">
          <div className="criterio-avaliacao-peso">{Math.round(PESOS_RUBRICA.autonomia * 100)}%</div>
          <div>
            <div className="criterio-avaliacao-nome">Autonomia <span className="tag-pill">automático</span></div>
            <div className="criterio-avaliacao-desc">Quanto menos rodadas de correção em média por lançamento, maior a autonomia.</div>
          </div>
        </div>
        <div className="criterio-avaliacao-row" style={{ borderBottom: "none" }}>
          <div className="criterio-avaliacao-peso">—</div>
          <div>
            <div className="criterio-avaliacao-nome">Desconto por atraso <span className="tag-pill">automático</span></div>
            <div className="criterio-avaliacao-desc">Aplicado por fora, no final, conforme o prazo da turma (ou prazo individual, se houver prorrogação).</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const label = { rascunho: "Rascunho", enviado: "Enviado p/ análise", aprovado: "Aprovado", correcao: "Correção necessária" }[status];
  return <span className={"status " + status}>{label}</span>;
}

export function Kpi({ label, value, tone }) {
  return (
    <div className={"kpi " + (tone || "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mono">{value}</div>
    </div>
  );
}

export function DrillModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{item.title}</h3>
          <button className="modal-close" onClick={onClose}>fechar ×</button>
        </div>
        <div className="modal-body">
          <p className="helper-note">{item.legenda}</p>
          <table>
            <thead><tr><th>Data</th><th>Documento</th><th>Histórico</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {item.linhas.map((m, i) => (
                <tr key={i}>
                  <td className="mono">{m.data}</td>
                  <td className="mono">{m.documento}</td>
                  <td>{m.historico}</td>
                  <td className="num mono">{(m.tipo === "D" ? "D  " : "C  ") + fmt(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

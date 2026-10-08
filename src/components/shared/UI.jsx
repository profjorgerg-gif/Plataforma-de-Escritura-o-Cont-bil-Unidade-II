import { useEffect, useState } from "react";
import { fmt, PESOS_RUBRICA } from "../../lib/contabil.js";

// Painel "O que será avaliado" — mesma estrutura nos dois lados (professor
// edita só o texto de "qualidade técnica", aluno só lê). Pedido do professor
// em 2026-10-08: antes só existiam os pesos em %, sem dizer o que de fato é
// observado — os alunos ficavam sem saber o critério real.
export function CriteriosAvaliacao({ turma, editavel, onSalvar }) {
  const [texto, setTexto] = useState(turma?.criteriosQualidade || "");
  const [salvando, setSalvando] = useState(false);

  // Se trocar de turma (professor) ou os dados chegarem depois (aluno),
  // atualiza o campo para refletir o que está salvo.
  useEffect(() => {
    setTexto(turma?.criteriosQualidade || "");
  }, [turma?.id, turma?.criteriosQualidade]);

  const definido = (turma?.criteriosQualidade || "").trim().length > 0;

  async function salvar() {
    if (!onSalvar) return;
    setSalvando(true);
    await onSalvar(texto.trim());
    setSalvando(false);
  }

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
            <div className="criterio-avaliacao-nome">
              Qualidade técnica {editavel ? <span className="tag-pill warn">manual — você define</span> : null}
            </div>
            {editavel ? (
              <>
                <div className="criterio-avaliacao-desc" style={{ marginBottom: 8 }}>Descreva aqui o que você observa para dar a nota de 0 a 10 — os alunos veem exatamente este texto.</div>
                <textarea
                  style={{ minHeight: 64 }}
                  placeholder="Ex.: coerência entre o fato contábil descrito, a conta escolhida e o CFOP/NCM da nota; clareza do histórico; ausência de inversões de débito/crédito..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button className="btn secondary" disabled={salvando} onClick={salvar}>Salvar critérios</button>
                </div>
              </>
            ) : (
              <div className={"criterio-avaliacao-desc" + (definido ? "" : " a-definir")}>
                {definido ? turma.criteriosQualidade : "A definir — o professor ainda não publicou os critérios desta parte."}
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

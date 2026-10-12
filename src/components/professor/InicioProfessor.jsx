import { PODC_PROF } from "../../lib/menuPodc.js";
import { etapasEfetivas } from "../../lib/roteiro.js";
import { useRoteiroTurma } from "../../hooks/useRoteiro.js";

// "Comece aqui" do professor (2026-10-12). Só LEITURA e navegação: não grava nada.
// Mostra o que exige ação hoje, o ciclo de trabalho em cada etapa (Planejamento, Organização, Direção e Controle)
// e os prazos das 6 etapas da turma selecionada.

const fmtPrazo = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

const ROTINA = [
  ["Antes da etapa", "Conferir prazos e, na etapa 2, publicar os empregados da folha", "Planejamento", "roteiro-prazos"],
  ["Antes da etapa", "Configurar a fase da turma (CA, Rescisão ou AGB)", "Organização", "turmas"],
  ["Durante", "Corrigir a fila e responder o suporte", "Direção", "fila"],
  ["No prazo", "Avaliar de 0 a 10 e mostrar a nota ao aluno", "Controle", "aval-prof"],
  ["Depois da análise", "Aprovar e liberar a próxima etapa", "Direção", "roteiro-lib"],
  ["Fim de cada etapa", "Digitar as notas no sistema da escola", "Controle", "notas"],
];

export default function InicioProfessor({ turma, contadores, onIr }) {
  const config = useRoteiroTurma(turma ? turma.id : null);
  const lista = etapasEfetivas(config || null);
  const explicacao = {
    P: "Defina etapas, prazos, empregados da folha e critérios.",
    O: "Organize turmas, fases da turma e material de apoio.",
    D: "Libere etapas, responda dúvidas e oriente quem precisa.",
    C: "Acompanhe entregas, avalie de 0 a 10 e registre as notas.",
  };
  const destinos = { P: "roteiro-prazos", O: "turmas", D: "painel", C: "dashboard-ciclo" };
  const fila = (contadores && contadores.fila) || 0;
  const suporte = (contadores && contadores.suporte) || 0;

  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div>
      <h2 className="screen-title">Comece aqui</h2>
      <p className="screen-sub">O menu segue a ordem em que você trabalha em cada etapa: planeja e configura, libera e orienta, depois acompanha e avalia.</p>

      <div className="balance-check ok" style={{ marginBottom: 18 }}>
        <b>Hoje{turma ? " · " + turma.nome : ""}:</b>{" "}
        {turma ? <>{fila} {fila === 1 ? "lançamento na fila de correção" : "lançamentos na fila de correção"} · {suporte} {suporte === 1 ? "pergunta nova no suporte" : "perguntas novas no suporte"}.</> : "nenhuma turma selecionada. Crie ou selecione uma em “Turmas”."}
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => onIr("fila")}>Fila de correção</button>
          <button className="btn secondary" onClick={() => onIr("suporte")}>Suporte</button>
          <button className="btn secondary" onClick={() => onIr("roteiro-lib")}>Liberar etapas</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Como o menu está organizado</h3></div>
        <div className="panel-body">
          <div className="kpi-row">
            {PODC_PROF.map((g) => (
              <div className="kpi" key={g.letra}>
                <div className="kpi-label mono">{g.letra} · {g.titulo}</div>
                <div style={{ fontSize: 13.5, margin: "4px 0 8px" }}>{explicacao[g.letra]}</div>
                <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(destinos[g.letra])}>Abrir</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Rotina sugerida em cada etapa</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Momento</th><th>O que fazer</th><th>Onde</th><th></th></tr></thead>
            <tbody>
              {ROTINA.map((r, i) => (
                <tr key={i}>
                  <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>
                  <td><button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(r[3])}>Abrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {turma && (
        <div className="panel">
          <div className="panel-head"><h3>Etapas e prazos da turma</h3></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>#</th><th>Etapa</th><th>Prazo</th><th className="num">Aulas</th></tr></thead>
              <tbody>
                {lista.map((e, i) => (
                  <tr key={e.id}><td className="mono">{i + 1}</td><td>{e.titulo}</td><td className="mono">{fmtPrazo(e.prazo)}</td><td className="num">{e.aulas != null ? e.aulas : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="helper-note" style={{ margin: "0 16px 16px" }}>Os prazos podem ser ajustados em “Etapas e prazos”. Os alunos veem o que está aqui.</div>
        </div>
      )}
    </>
  );
}

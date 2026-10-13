// "Hoje" do professor (2026-10-13; antes "Comece aqui"). Só LEITURA e navegação: não grava nada.
// Mostra o que exige ação hoje, onde fica cada coisa no menu e a rotina sugerida em cada etapa.
// A tabela de prazos saiu daqui: os prazos ficam em "Etapas, prazos e liberação" (uma só fonte).

const ROTINA = [
  ["Antes da etapa", "Conferir prazos e, na etapa 2, publicar os empregados da folha", "Etapas, prazos e liberação · Atividade da folha", "roteiro-prazos"],
  ["Antes da etapa", "Configurar a etapa da turma (CA, Rescisão ou AGB)", "Etapas do projeto", "turmas"],
  ["Durante", "Corrigir a fila e responder o suporte", "Todo dia", "fila"],
  ["No prazo", "Avaliar de 0 a 10 e mostrar a nota ao aluno", "Alunos e notas", "aval-prof"],
  ["Depois da análise", "Aprovar e liberar a próxima etapa", "Etapas, prazos e liberação", "roteiro-lib"],
  ["Fim de cada etapa", "Digitar as notas no sistema da escola", "Alunos e notas", "notas"],
];

const GRUPOS = [
  { t: "Todo dia", d: "Fila de correção, Suporte e a Diretriz da semana para o quadro.", ir: "fila" },
  { t: "Planejar o ciclo", d: "Etapas, prazos, cronograma, liberação das etapas e as turmas.", ir: "roteiro-prazos" },
  { t: "Etapas do projeto", d: "Uma tela para cada etapa: preparar a turma e corrigir os trabalhos.", ir: "painel" },
  { t: "Alunos e notas", d: "Histórico, registro e orientação por aluno; notas e avaliação de 0 a 10.", ir: "aval-prof" },
  { t: "Materiais", d: "Caderno e Roteiro do Aluno, consultas e modelos de mensagens.", ir: "caderno" },
  { t: "Ajuda e manutenção", d: "Guias e manuais, roteiro de testes, modo de teste e refazer nota (fechados por padrão).", ir: "guia" },
];

export default function InicioProfessor({ turma, contadores, onIr }) {
  const fila = (contadores && contadores.fila) || 0;
  const suporte = (contadores && contadores.suporte) || 0;

  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div>
      <h2 className="screen-title">Hoje</h2>
      <p className="screen-sub">O menu está organizado pelo que você faz: o que é de todo dia fica em cima; o que se usa uma vez por etapa vem depois; ajuda e manutenção ficam fechadas no fim.</p>

      <div className="balance-check ok" style={{ marginBottom: 18 }}>
        <b>Hoje{turma ? " · " + turma.nome : ""}:</b>{" "}
        {turma ? <>{fila} {fila === 1 ? "lançamento na fila de correção" : "lançamentos na fila de correção"} · {suporte} {suporte === 1 ? "pergunta nova no suporte" : "perguntas novas no suporte"}.</> : "nenhuma turma selecionada. Crie ou selecione uma em “Turmas”."}
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => onIr("fila")}>Fila de correção</button>
          <button className="btn secondary" onClick={() => onIr("suporte")}>Suporte</button>
          <button className="btn secondary" onClick={() => onIr("roteiro-lib")}>Liberar etapas</button>
          <button className="btn secondary" onClick={() => onIr("diretriz")}>Diretriz da semana</button>
          <button className="btn secondary" onClick={() => onIr("roteiro-prazos")}>Etapas e prazos</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Onde fica cada coisa</h3></div>
        <div className="panel-body">
          <div className="kpi-row">
            {GRUPOS.map((g) => (
              <div className="kpi" key={g.t}>
                <div className="kpi-label mono">{g.t}</div>
                <div style={{ fontSize: 13.5, margin: "4px 0 8px" }}>{g.d}</div>
                <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(g.ir)}>Abrir</button>
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
        <div className="helper-note" style={{ margin: "0 16px 16px" }}>Os prazos de cada etapa ficam em “Etapas, prazos e liberação” (aba Etapas e prazos). Os alunos veem o que está lá.</div>
      </div>
    </>
  );
}

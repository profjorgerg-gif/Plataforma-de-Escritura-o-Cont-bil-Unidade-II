import { useMemo, useState } from "react";
import { salvarConfigCa } from "../../hooks/useCa.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { folhaEmUso, EMPREGADOS_MATERIAL } from "../../lib/folha.js";
import { casoDoEmpregado, textoDoCaso, enunciadosLancamentos } from "../../lib/enunciadosCA.js";

// Controle do professor sobre os enunciados das etapas 2 e 3. Só grava dois campos novos em turmas/{t}/ca/config
// (enunciadoAtivo, enunciadoObs), que o professor já pode escrever. Os alunos só leem.
export default function EnunciadosCa({ turma, ca }) {
  const alunos = useAlunosDaTurma(turma?.id);
  const cfg = ca.config || {};
  const [obs, setObs] = useState(null);
  const [msg, setMsg] = useState("");
  const [mat, setMat] = useState("");
  const [empId, setEmpId] = useState("");
  const f = useMemo(() => folhaEmUso(ca.folha), [ca.folha]);
  const empregados = (cfg.empregados && cfg.empregados.length ? cfg.empregados : EMPREGADOS_MATERIAL.map((e, i) => ({ id: "m" + i, nome: e.nome })));
  const emp = empregados.find((e) => e.id === empId) || empregados[0];
  const ativo = cfg.enunciadoAtivo !== false;
  const obsAtual = obs === null ? (cfg.enunciadoObs || "") : obs;
  const aluno = (alunos || []).find((a) => a.matricula === mat);
  const enun = useMemo(() => enunciadosLancamentos(ca.folha, obsAtual), [ca.folha, obsAtual]);

  async function salvar(dados, ok) {
    setMsg("salvando…");
    try { await salvarConfigCa(turma.id, dados); setMsg(ok); }
    catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  return (
    <>
      <div className="panel">
        <div className="panel-head"><h3>Enunciados das etapas 2 e 3</h3></div>
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>Etapa 2: o aluno pode <b>receber o seu caso</b> de contracheque (dados diferentes para cada aluno e empregado). Etapa 3: cada um dos 6 lançamentos mostra um enunciado com a data, o fato e a base. Os enunciados <b>não trazem contas nem os valores calculados</b>.</p>
          <span className={"tag-pill " + (ativo ? "ok" : "warn")}>{ativo ? "Enunciados ligados" : "Enunciados desligados"}</span>{" "}
          <button className="btn secondary" onClick={() => salvar({ enunciadoAtivo: !ativo }, ativo ? "Desligado: a tela do aluno volta a ser como era." : "Ligado.")}>{ativo ? "Desligar" : "Ligar"}</button>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Observação do professor (entra no fim de cada enunciado)</label>
            <textarea rows={2} style={{ width: "100%" }} value={obsAtual} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: considere 30 dias no mês." />
          </div>
          <button className="btn" disabled={obs === null} onClick={() => salvar({ enunciadoObs: obsAtual.trim() }, "Observação salva.")}>Salvar observação</button>
          {msg && <span style={{ marginLeft: 8, fontSize: 13 }}>{msg}</span>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Ver o caso que um aluno recebeu (etapa 2)</h3></div>
        <div className="panel-body">
          <div className="grid-2">
            <div className="field"><label>Aluno</label>
              <select value={mat} onChange={(e) => setMat(e.target.value)}>
                <option value="">Selecione…</option>
                {[...(alunos || [])].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")).map((a) => <option key={a.matricula} value={a.matricula}>{a.nome}</option>)}
              </select></div>
            <div className="field"><label>Empregado</label>
              <select value={emp ? emp.id : ""} onChange={(e) => setEmpId(e.target.value)}>
                {empregados.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select></div>
          </div>
          {aluno && emp && <p>{textoDoCaso(emp.nome, casoDoEmpregado(aluno.matricula, emp.id, f.competencia), f.competencia, obsAtual)}</p>}
          {!aluno && <div className="helper-note">Escolha um aluno para ver o enunciado dele.</div>}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><h3>Enunciados dos 6 lançamentos (etapa 3)</h3></div>
        <div className="panel-body">
          {Object.values(enun).map((t, i) => <p key={i} style={{ margin: "0 0 8px" }}><b>{i + 1}.</b> {t}</p>)}
        </div>
      </div>
    </>
  );
}

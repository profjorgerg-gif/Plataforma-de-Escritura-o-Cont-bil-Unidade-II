import { useState } from "react";
import { collection, doc, addDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase.js";
import { useTurmasDoProfessor } from "../../hooks/useTurmasDoProfessor.js";
import { useAlunosDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { extrairLinhasPdf, candidatosDeLinhas } from "../../lib/importarAlunosPdf.js";

export default function Turmas({ uid, turmaSelecionadaId, setTurmaSelecionadaId, onSelecionarAluno }) {
  const turmas = useTurmasDoProfessor(uid);
  const turmaAtual = turmas?.find((t) => t.id === turmaSelecionadaId) || turmas?.[0] || null;
  const alunos = useAlunosDaTurma(turmaAtual?.id);

  const [novoNomeTurma, setNovoNomeTurma] = useState("");
  const [novoAluno, setNovoAluno] = useState("");
  const [novaMatricula, setNovaMatricula] = useState("");
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [candidatos, setCandidatos] = useState(null);
  const [erroImportacao, setErroImportacao] = useState("");

  async function criarTurma() {
    if (!novoNomeTurma.trim()) return;
    const ref = await addDoc(collection(db, "turmas"), {
      nome: novoNomeTurma.trim(), professorId: uid, documentosIds: [],
      prazoUnidadeII: "", descontoPorDiaAtraso: 0, penalidadeAtrasoFixa: 2,
      criadoEm: serverTimestamp(),
    });
    setTurmaSelecionadaId(ref.id);
    setNovoNomeTurma("");
  }

  async function adicionarAluno() {
    if (!novoAluno.trim() || !novaMatricula.trim() || !turmaAtual) return;
    await setDoc(doc(db, "turmas", turmaAtual.id, "alunos", novaMatricula.trim()), {
      nome: novoAluno.trim(), uid: null, nota: null, notaLiberada: false,
      prazoIndividual: null, prazoHistorico: [], dataEntrega: null, desconto: 0, descontoManual: false,
    });
    setNovoAluno(""); setNovaMatricula("");
  }

  async function handleArquivoPdf(file) {
    setImportandoPdf(true); setErroImportacao(""); setCandidatos(null);
    try {
      const linhas = await extrairLinhasPdf(file);
      const encontrados = candidatosDeLinhas(linhas);
      if (encontrados.length === 0) {
        setErroImportacao("Não encontrei linhas com nome + matrícula reconhecíveis nesse PDF. Ele pode ser uma imagem escaneada (sem texto) ou usar um formato diferente do esperado.");
      }
      setCandidatos(encontrados);
    } catch (e) {
      setErroImportacao("Não foi possível ler esse PDF.");
    }
    setImportandoPdf(false);
  }

  function toggleCandidato(i) { setCandidatos(candidatos.map((c, idx) => (idx === i ? { ...c, incluir: !c.incluir } : c))); }
  function editarCandidato(i, field, val) { setCandidatos(candidatos.map((c, idx) => (idx === i ? { ...c, [field]: val } : c))); }

  async function confirmarImportacao() {
    const matriculasAtuais = (alunos || []).map((a) => a.matricula);
    const novos = candidatos.filter((c) => c.incluir && c.nome.trim() && !matriculasAtuais.includes(c.matricula));
    await Promise.all(novos.map((c) =>
      setDoc(doc(db, "turmas", turmaAtual.id, "alunos", c.matricula), {
        nome: c.nome.trim(), uid: null, nota: null, notaLiberada: false,
        prazoIndividual: null, prazoHistorico: [], dataEntrega: null, desconto: 0, descontoManual: false,
      })
    ));
    setCandidatos(null);
  }

  if (turmas === null) return <div className="empty-state">Carregando turmas…</div>;

  return (
    <>
      <div className="screen-eyebrow">turmas</div>
      <h2 className="screen-title">Turmas</h2>
      <p className="screen-sub">Crie turmas e cadastre os alunos que terão empresa didática própria na Unidade II.</p>

      <div className="panel">
        <div className="panel-head"><h3>Suas turmas</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          {turmas.length === 0 ? <div className="empty-state">Nenhuma turma ainda.</div> : (
            <table>
              <thead><tr><th>Turma</th><th className="num">Alunos liberados p/ documentos</th></tr></thead>
              <tbody>
                {turmas.map((t) => (
                  <tr key={t.id} className="clickable" onClick={() => setTurmaSelecionadaId(t.id)}>
                    <td>{t.nome}{t.id === turmaAtual?.id ? "  ·  (selecionada)" : ""}</td>
                    <td className="num mono">{(t.documentosIds || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-head"><h3>Nova turma</h3></div>
        <div className="panel-body">
          <div className="field"><label>Nome da turma</label><input value={novoNomeTurma} onChange={(e) => setNovoNomeTurma(e.target.value)} /></div>
          <div className="btn-row"><button className="btn secondary" onClick={criarTurma}>+ Criar turma</button></div>
        </div>
      </div>

      {turmaAtual && (
        <div className="panel" style={{ marginBottom: 22 }}>
          <div className="panel-head"><h3>Prazo e pontualidade — {turmaAtual.nome}</h3></div>
          <div className="panel-body">
            <div className="field">
              <label>Prazo da Unidade II (vale para toda a turma)</label>
              <input type="date" className="mono" value={turmaAtual.prazoUnidadeII || ""}
                onChange={(e) => updateDoc(doc(db, "turmas", turmaAtual.id), { prazoUnidadeII: e.target.value })} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Penalidade no 1º dia de atraso (pontos)</label>
                <input type="number" min={0} step={0.5} className="mono" value={turmaAtual.penalidadeAtrasoFixa ?? 2}
                  onChange={(e) => updateDoc(doc(db, "turmas", turmaAtual.id), { penalidadeAtrasoFixa: Number(e.target.value) || 0 })} />
              </div>
              <div className="field">
                <label>Desconto por dia adicional de atraso (a partir do 2º dia)</label>
                <input type="number" min={0} step={0.1} className="mono" value={turmaAtual.descontoPorDiaAtraso ?? 0}
                  onChange={(e) => updateDoc(doc(db, "turmas", turmaAtual.id), { descontoPorDiaAtraso: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="helper-note">Calculado automaticamente assim que houver atraso: penalidade fixa no 1º dia + (dias adicionais × desconto por dia). O professor sempre pode sobrescrever o valor no Painel, em Avaliação.</div>
          </div>
        </div>
      )}

      {turmaAtual && (
        <div className="panel">
          <div className="panel-head"><h3>Alunos — {turmaAtual.nome}</h3></div>
          <div className="panel-body">
            <div className="btn-row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
              <input placeholder="Nome do aluno" value={novoAluno} onChange={(e) => setNovoAluno(e.target.value)} style={{ maxWidth: 220, padding: "7px 10px", border: "1px solid var(--line-strong)", background: "var(--paper)" }} />
              <input placeholder="Matrícula" className="mono" value={novaMatricula} onChange={(e) => setNovaMatricula(e.target.value)} style={{ maxWidth: 140, padding: "7px 10px", border: "1px solid var(--line-strong)", background: "var(--paper)" }} />
              <button className="btn secondary" onClick={adicionarAluno}>+ Adicionar aluno</button>
              <label className="btn secondary" style={{ cursor: "pointer" }}>
                {importandoPdf ? "Lendo PDF…" : "Importar lista (PDF)"}
                <input type="file" accept=".pdf" style={{ display: "none" }} disabled={importandoPdf}
                  onChange={(e) => { if (e.target.files[0]) handleArquivoPdf(e.target.files[0]); e.target.value = ""; }} />
              </label>
            </div>

            {erroImportacao && <div className="balance-check bad" style={{ marginBottom: 14 }}>{erroImportacao}</div>}

            {candidatos && (
              <div className="panel" style={{ marginBottom: 16 }}>
                <div className="panel-head"><h3>Revisar antes de importar ({candidatos.filter((c) => c.incluir).length} de {candidatos.length})</h3></div>
                <div className="panel-body">
                  <div className="helper-note">Extraído automaticamente do PDF — confira nome e matrícula linha a linha e desmarque o que não for aluno de verdade.</div>
                  <table>
                    <thead><tr><th></th><th>Nome</th><th>Matrícula</th></tr></thead>
                    <tbody>
                      {candidatos.map((c, i) => (
                        <tr key={i}>
                          <td><input type="checkbox" checked={c.incluir} onChange={() => toggleCandidato(i)} style={{ width: "auto" }} /></td>
                          <td><input value={c.nome} onChange={(e) => editarCandidato(i, "nome", e.target.value)} /></td>
                          <td><input className="mono" value={c.matricula} onChange={(e) => editarCandidato(i, "matricula", e.target.value)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="btn-row">
                    <button className="btn" onClick={confirmarImportacao}>Confirmar importação</button>
                    <button className="btn secondary" onClick={() => setCandidatos(null)}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            <table>
              <thead><tr><th>Aluno</th><th>Matrícula</th><th className="num">Nota</th><th></th></tr></thead>
              <tbody>
                {(alunos || []).map((a) => (
                  <tr key={a.matricula} className="clickable" onClick={() => onSelecionarAluno(a)}>
                    <td>{a.nome}</td>
                    <td className="mono">{a.matricula}</td>
                    <td className="num mono">{a.notaLiberada ? a.nota : "—"}</td>
                    <td><span className="tag-pill">ver histórico →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

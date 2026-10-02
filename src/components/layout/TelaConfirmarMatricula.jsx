import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

// Tela nova (não existia no protótipo, decidida junto com o fluxo de login):
// no primeiro acesso, o aluno confirma a matrícula que o professor já
// cadastrou na turma (Painel do Professor → Turmas → Importar lista / +
// Adicionar aluno, no protótipo).
//
// HISTÓRICO (2026-10-02): a versão original fazia um collectionGroup query
// sobre "alunos" filtrando por matricula, para achar a turma sem o aluno
// precisar saber de antemão. Isso quebrou em produção: o Firestore nega
// (permission-denied) um collectionGroup cuja regra depende de get() em
// outro documento (ex.: souProfessorDaTurma), mesmo quando outra parte da
// regra já é satisfeita só pelo filtro da query — não há como provar
// estaticamente que o restante do OR nunca entraria em jogo. Depurado ao
// vivo com alunos reais travados no primeiro acesso.
//
// SOLUÇÃO: em vez de buscar dentro de turmas/*/alunos/*, agora existe um
// índice plano e de baixa sensibilidade em matriculas/{matricula} — só
// matrícula, turmaId e uid, sem nome nem nota — mantido em sincronia pelo
// Painel do Professor (Turmas.jsx) e por este próprio fluxo. Um get() direto
// num documento não tem essa limitação de collectionGroup, então funciona
// de forma simples e previsível.

export default function TelaConfirmarMatricula({ usuario, onConfirmar, onSair }) {
  const [matricula, setMatricula] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setErro("");
    if (!matricula.trim()) return;
    setCarregando(true);
    try {
      let snap;
      try {
        snap = await getDoc(doc(db, "matriculas", matricula.trim()));
      } catch (e) {
        throw new Error("[busca] " + (e.message || e.code || "erro desconhecido"));
      }
      if (!snap.exists() || snap.data().uid) {
        setErro("Matrícula não encontrada ou já vinculada a outra conta Google. Confira o número ou procure o professor responsável.");
        setCarregando(false);
        return;
      }
      const turmaId = snap.data().turmaId;
      await onConfirmar(matricula.trim(), turmaId);
    } catch (e) {
      // Mostra o motivo técnico direto na tela — geralmente é falta de um
      // índice do Firestore, e a mensagem já traz o link para criá-lo.
      setErro("Não foi possível confirmar agora: " + (e.message || e.code || "erro desconhecido"));
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EEF1EF", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#ffffff", border: "1px solid #D7DEDA", boxShadow: "0 8px 28px rgba(20,30,24,0.08)", padding: "40px 36px", boxSizing: "border-box" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5C6660", textTransform: "uppercase", marginBottom: 10 }}>Primeiro acesso</div>
        <h1 style={{ margin: "0 0 10px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#0B2A1C" }}>Confirme sua matrícula</h1>
        <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#4A544E" }}>
          Conta conectada: <b>{usuario.email}</b>
        </p>
        <p style={{ margin: "0 0 22px 0", fontSize: 13.5, color: "#6B746E", lineHeight: 1.6 }}>
          Digite a matrícula informada pelo seu professor. Sua empresa didática é criada automaticamente assim que confirmar.
        </p>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          placeholder="Matrícula"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 15, border: "1px solid #D7DEDA", marginBottom: 14 }}
        />
        {erro && (
          <div style={{ background: "#FBEAEA", border: "1px solid #E3B4B4", color: "#8A2A2A", padding: "10px 12px", fontSize: 13, marginBottom: 14, wordBreak: "break-word" }}>
            {erro}
          </div>
        )}
        <button
          onClick={confirmar}
          disabled={carregando}
          style={{ width: "100%", padding: 14, background: "#0B5D3B", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: carregando ? "default" : "pointer", opacity: carregando ? 0.7 : 1 }}
        >
          {carregando ? "Confirmando…" : "Confirmar matrícula"}
        </button>
        <button
          onClick={onSair}
          style={{ width: "100%", padding: 10, background: "none", border: "none", color: "#6B746E", fontSize: 13, marginTop: 14, cursor: "pointer", textDecoration: "underline" }}
        >
          Sair / trocar de conta
        </button>
      </div>
    </div>
  );
}

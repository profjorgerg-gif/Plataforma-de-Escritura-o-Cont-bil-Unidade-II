import { useState } from "react";
import { collectionGroup, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase.js";

// Tela nova (não existia no protótipo, decidida junto com o fluxo de login):
// no primeiro acesso, o aluno confirma a matrícula que o professor já
// cadastrou na turma (Painel do Professor → Turmas → Importar lista / +
// Adicionar aluno, no protótipo). Aqui isso vira uma busca real no Firestore:
// um collectionGroup sobre "alunos", filtrando pelo campo "matricula".
//
// Requisito de dados: cada documento turmas/{turmaId}/alunos/{matricula}
// precisa também guardar matricula como CAMPO (duplicando o id do
// documento) — é o que torna essa busca por collectionGroup possível sem
// saber de antemão a turma. Isso está anotado no documento de modelo de
// dados; ajuste lá se decidirem representar de outro jeito.

export default function TelaConfirmarMatricula({ usuario, onConfirmar }) {
  const [matricula, setMatricula] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setErro("");
    if (!matricula.trim()) return;
    setCarregando(true);
    try {
      const q = query(collectionGroup(db, "alunos"), where("matricula", "==", matricula.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        setErro("Matrícula não encontrada. Confira o número ou procure o professor responsável.");
        setCarregando(false);
        return;
      }
      const alunoDoc = snap.docs[0];
      if (alunoDoc.data().uid) {
        setErro("Essa matrícula já está vinculada a outra conta Google. Procure o professor.");
        setCarregando(false);
        return;
      }
      const turmaId = alunoDoc.ref.parent.parent.id;
      await onConfirmar(matricula.trim(), turmaId);
    } catch (e) {
      setErro("Não foi possível confirmar agora. Tente novamente em instantes.");
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
          <div style={{ background: "#FBEAEA", border: "1px solid #E3B4B4", color: "#8A2A2A", padding: "10px 12px", fontSize: 13, marginBottom: 14 }}>
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
      </div>
    </div>
  );
}

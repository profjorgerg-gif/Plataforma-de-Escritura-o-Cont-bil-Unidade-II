import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

// Gate de entrada do professor, mostrado A CADA login (depois do Google) —
// protege contra alguém continuar numa sessão Google do professor já
// aberta/esquecida num computador da escola. A senha fica guardada em
// configuracao/professor (campo "senha"), um documento que só quem já tem
// papel "professor" ou "admin" consegue LER (regra do Firestore) — ou seja,
// um aluno nem consegue buscar essa senha para tentar adivinhar, porque a
// promoção a professor (feita manualmente no Console) já é a barreira real;
// isto aqui é uma camada extra de fricção por cima dela.

export default function ConfirmarSenhaProfessor({ usuario, onConfirmar, onSair }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function confirmar() {
    setErro("");
    if (!senha) return;
    setCarregando(true);
    try {
      const snap = await getDoc(doc(db, "configuracao", "professor"));
      const senhaCorreta = snap.exists() ? snap.data().senha : null;
      if (!senhaCorreta) {
        setErro('Nenhuma senha configurada ainda. Crie o documento "configuracao/professor" no Firestore com o campo "senha".');
      } else if (senha === senhaCorreta) {
        onConfirmar();
      } else {
        setErro("Senha incorreta.");
      }
    } catch (e) {
      setErro("Não foi possível conferir a senha agora: " + (e.message || e.code || "erro desconhecido"));
    }
    setCarregando(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EEF1EF", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#ffffff", border: "1px solid #D7DEDA", boxShadow: "0 8px 28px rgba(20,30,24,0.08)", padding: "40px 36px", boxSizing: "border-box" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5C6660", textTransform: "uppercase", marginBottom: 10 }}>Acesso do professor</div>
        <h1 style={{ margin: "0 0 10px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#0B2A1C" }}>Digite a senha de acesso</h1>
        <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#4A544E" }}>
          Conta conectada: <b>{usuario.email}</b>
        </p>
        <p style={{ margin: "0 0 22px 0", fontSize: 13.5, color: "#6B746E", lineHeight: 1.6 }}>
          Confirmação extra a cada login, além do Google — protege o Painel do Professor mesmo se este computador ficar com a conta Google aberta.
        </p>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          placeholder="Senha"
          autoFocus
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
          {carregando ? "Conferindo…" : "Entrar"}
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

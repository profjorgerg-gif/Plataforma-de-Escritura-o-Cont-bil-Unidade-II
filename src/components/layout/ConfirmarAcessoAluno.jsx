import { useState } from "react";

// Gate de entrada do aluno, mostrado em TODO login (não só no primeiro
// acesso) — pedido do professor: mesmo já com a matrícula vinculada à conta
// Google, o aluno digita a matrícula de novo a cada vez, como uma camada
// extra antes de entrar (evita que alguém continue numa sessão Google já
// aberta/esquecida num computador da escola sem saber a matrícula do
// colega). Não é uma regra de segurança do Firestore — a permissão real
// continua vindo do uid, isso aqui é só uma confirmação de fricção mesmo.

export default function ConfirmarAcessoAluno({ usuario, matriculaEsperada, onConfirmar, onSair }) {
  const [matricula, setMatricula] = useState("");
  const [erro, setErro] = useState("");

  function confirmar() {
    setErro("");
    if (matricula.trim() === String(matriculaEsperada)) {
      onConfirmar();
    } else {
      setErro("Matrícula incorreta. Digite a mesma matrícula do seu cadastro.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EEF1EF", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ width: 420, maxWidth: "100%", background: "#ffffff", border: "1px solid #D7DEDA", boxShadow: "0 8px 28px rgba(20,30,24,0.08)", padding: "40px 36px", boxSizing: "border-box" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5C6660", textTransform: "uppercase", marginBottom: 10 }}>Confirmação de acesso</div>
        <h1 style={{ margin: "0 0 10px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#0B2A1C" }}>Digite sua matrícula</h1>
        <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#4A544E" }}>
          Conta conectada: <b>{usuario.email}</b>
        </p>
        <p style={{ margin: "0 0 22px 0", fontSize: 13.5, color: "#6B746E", lineHeight: 1.6 }}>
          Por segurança, confirme sua matrícula toda vez que entrar.
        </p>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          placeholder="Matrícula"
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
          style={{ width: "100%", padding: 14, background: "#0B5D3B", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
        >
          Entrar
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

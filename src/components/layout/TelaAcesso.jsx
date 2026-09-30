import { useState } from "react";

// Tela de acesso — visual escuro aprovado por mockup. O seletor "Perfil de
// acesso" é só para ajustar a mensagem mostrada (o papel de verdade vem do
// Firestore, não do que a pessoa clica aqui): tanto aluno quanto professor
// entram com "Continuar com Google". A diferença real acontece DEPOIS do
// login — App.jsx pede a matrícula de novo (aluno) ou uma senha extra
// (professor/admin) a cada acesso, ver ConfirmarAcessoAluno e
// ConfirmarSenhaProfessor.

const CORES = {
  bg: "#0E1B15",
  card: "#152420",
  cardBorder: "#2A3D34",
  accent: "#D9A44E",
  accentInk: "#241A08",
  heading: "#F3EEE1",
  sub: "#9FB3A8",
  label: "#7FA3B0",
};

export default function TelaAcesso({ onEntrarGoogle }) {
  const [perfil, setPerfil] = useState("aluno"); // "aluno" | "professor" — só ajusta o texto

  return (
    <div style={{
      minHeight: "100vh", width: "100%", background: CORES.bg,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box",
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    }}>
      <div style={{
        width: 460, maxWidth: "100%", background: CORES.card, border: `1px solid ${CORES.cardBorder}`,
        borderTop: `3px solid ${CORES.accent}`, borderRadius: 10, padding: "38px 36px", boxSizing: "border-box",
      }}>
        <h1 style={{ margin: "0 0 8px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 26, fontWeight: 600, color: CORES.heading }}>
          Entrar na plataforma
        </h1>
        <p style={{ margin: "0 0 26px 0", fontSize: 14.5, color: CORES.sub }}>
          Acesse com sua conta para continuar seus estudos.
        </p>

        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: CORES.label, marginBottom: 10 }}>
          Perfil de acesso
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {[{ id: "aluno", label: "Aluno(a)" }, { id: "professor", label: "Professor(a)" }].map((op) => {
            const ativo = perfil === op.id;
            return (
              <button
                key={op.id}
                onClick={() => setPerfil(op.id)}
                style={{
                  flex: 1, padding: "16px 10px", borderRadius: 8, cursor: "pointer",
                  fontSize: 14.5, fontWeight: 600,
                  background: ativo ? CORES.accent : "transparent",
                  color: ativo ? CORES.accentInk : CORES.sub,
                  border: `1px solid ${ativo ? CORES.accent : CORES.cardBorder}`,
                }}
              >
                {op.label}
              </button>
            );
          })}
        </div>

        {perfil === "professor" && (
          <div style={{ fontSize: 13, color: CORES.sub, marginBottom: 18, lineHeight: 1.5 }}>
            Depois do Google, uma senha adicional será pedida para entrar no Painel do Professor.
          </div>
        )}

        <button
          onClick={onEntrarGoogle}
          style={{
            width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: 14, minHeight: 50, borderRadius: 8, background: "#1E3229", border: `1px solid ${CORES.cardBorder}`,
            color: CORES.heading, fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
          </svg>
          Continuar com Google
        </button>

        <div style={{ marginTop: 22, fontSize: 12, color: CORES.sub, textAlign: "center" }}>
          Técnico em Contabilidade
        </div>
      </div>
    </div>
  );
}

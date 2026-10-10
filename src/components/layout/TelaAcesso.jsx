import { useState } from "react";

// Tela de acesso — modelo A aprovado (2026-10-09): painel institucional à
// esquerda (curso + as 10 etapas) e cartão de entrada à direita. No celular
// vira uma coluna só, com o cartão de entrada primeiro.
// O seletor "Perfil de acesso" é só para ajustar a mensagem mostrada (o papel
// de verdade vem do Firestore, não do que a pessoa clica aqui): tanto aluno
// quanto professor entram com "Continuar com Google". A diferença real
// acontece DEPOIS do login — App.jsx pede a matrícula de novo (aluno) ou uma
// senha extra (professor/admin) a cada acesso, ver ConfirmarAcessoAluno e
// ConfirmarSenhaProfessor. Nada disso foi alterado: só o visual.

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

const ETAPAS = [
  ["1", "Empresa didática"], ["6", "Livro razão"],
  ["2", "Documentos fiscais"], ["7", "Balancete"],
  ["3", "Digitação e análise"], ["8–9", "ARE e DRE"],
  ["4", "Classificação"], ["10", "Balanço patrimonial"],
  ["5", "Livro diário"], ["💬", "Suporte com o professor"],
];

const CSS = `
.ta-wrap{min-height:100vh;width:100%;display:flex;background:${CORES.bg};font-family:'IBM Plex Sans',system-ui,sans-serif;box-sizing:border-box}
.ta-left{flex:1.15;background:linear-gradient(160deg,#1F5C4A,${CORES.bg});color:${CORES.heading};padding:64px 60px;display:flex;flex-direction:column;justify-content:space-between;gap:40px;box-sizing:border-box}
.ta-kicker{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.14em;color:${CORES.accent}}
.ta-title{font-family:'Lora',Georgia,serif;font-weight:600;font-size:44px;line-height:1.1;margin:14px 0 10px}
.ta-desc{color:#c3d6cc;font-size:16px;max-width:460px;line-height:1.5;margin:0}
.ta-steps{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;font-size:14px;color:#dbe8e1;list-style:none;padding:0;margin:0}
.ta-steps b{color:${CORES.accent};margin-right:8px;font-weight:700}
.ta-right{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}
.ta-card{width:400px;max-width:100%;background:${CORES.card};border:1px solid ${CORES.cardBorder};border-top:3px solid ${CORES.accent};border-radius:10px;padding:34px;box-sizing:border-box}
@media (max-width:820px){
  .ta-wrap{flex-direction:column-reverse;justify-content:flex-end}
  .ta-left{flex:none;padding:28px 22px;gap:20px}
  .ta-title{font-size:30px}
  .ta-desc{font-size:14px}
  .ta-steps{gap:8px 14px;font-size:12.5px}
  .ta-right{flex:none;padding:22px 16px 6px}
  .ta-card{padding:26px 22px}
}
`;

export default function TelaAcesso({ onEntrarGoogle }) {
  const [perfil, setPerfil] = useState("aluno"); // "aluno" | "professor" — só ajusta o texto

  return (
    <div className="ta-wrap">
      <style>{CSS}</style>

      <div className="ta-left">
        <div>
          <div className="ta-kicker">CEDUP HERMANN HERING · TÉCNICO EM CONTABILIDADE</div>
          <h1 className="ta-title">Escrituração<br />Contábil</h1>
          <p className="ta-desc">
            Contabilidade Intermediária — Unidade II. Pratique, passo a passo, o ciclo completo: da nota fiscal ao balanço patrimonial.
          </p>
        </div>
        <ul className="ta-steps">
          {ETAPAS.map(([n, r]) => <li key={r}><b>{n}</b>{r}</li>)}
        </ul>
      </div>

      <div className="ta-right">
        <div className="ta-card">
          <h2 style={{ margin: "0 0 6px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 24, fontWeight: 600, color: CORES.heading }}>
            Entrar na plataforma
          </h2>
          <p style={{ margin: "0 0 22px 0", fontSize: 14, color: CORES.sub }}>
            Acesse com sua conta Google.
          </p>

          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: CORES.label, marginBottom: 8 }}>
            Perfil de acesso
          </div>
          <div style={{ display: "flex", gap: 10 }}>
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

          <button
            onClick={onEntrarGoogle}
            style={{
              width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              marginTop: 20, padding: 14, minHeight: 50, borderRadius: 8, background: "#1E3229", border: `1px solid ${CORES.cardBorder}`,
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

          <div style={{ marginTop: 16, fontSize: 12.5, color: CORES.sub, textAlign: "center", lineHeight: 1.5 }}>
            {perfil === "professor"
              ? "Depois do Google, uma senha adicional será pedida para entrar no Painel do Professor."
              : "Seu acesso é confirmado com a matrícula após o login."}
          </div>
        </div>
      </div>
    </div>
  );
}

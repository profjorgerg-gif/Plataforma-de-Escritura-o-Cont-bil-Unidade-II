// Tela de acesso — Opção 2 (Institucional), aprovada pelo professor.
// Porta o visual do protótipo; o botão agora dispara o login Google de verdade
// (a função onEntrar vem do App.jsx, via signInWithPopup).

export default function TelaAcesso({ onEntrar }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#EEF1EF", color: "#1B1F1D", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 6, width: "100%", display: "flex" }}>
        <div style={{ flex: 1, background: "#0B5D3B" }} />
        <div style={{ flex: 1, background: "#F4F4F0" }} />
        <div style={{ flex: 1, background: "#B4272B" }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 24px", borderBottom: "1px solid #D7DEDA", background: "#ffffff" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0B5D3B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" stroke="#ffffff" strokeWidth="1.6" />
            <path d="M8 11h8M8 15h5" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.02em" }}>CEDUP HERMANN HERING</div>
          <div style={{ fontSize: 12, color: "#5C6660" }}>Secretaria de Estado da Educação de Santa Catarina</div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, boxSizing: "border-box" }}>
        <div style={{ width: 440, maxWidth: "100%", background: "#ffffff", border: "1px solid #D7DEDA", boxShadow: "0 8px 28px rgba(20,30,24,0.08)", padding: "44px 40px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5C6660", textTransform: "uppercase", marginBottom: 10 }}>
            Portal do Aluno e do Professor
          </div>
          <h1 style={{ margin: "0 0 14px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 26, fontWeight: 600, lineHeight: 1.3, color: "#0B2A1C" }}>
            Escrituração Contábil — Contabilidade Intermediária
          </h1>
          <p style={{ margin: "0 0 30px 0", fontSize: 14.5, color: "#4A544E", lineHeight: 1.65 }}>
            Utilize sua conta Google institucional para acessar. Alunos confirmam a matrícula no primeiro acesso.
          </p>
          <button
            onClick={onEntrar}
            style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 14, minHeight: 50, background: "#0B5D3B", border: "none", color: "#ffffff", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Continuar com Google
          </button>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #E6EAE7", fontSize: 12.5, color: "#6B746E", lineHeight: 1.6 }}>
            Acesso institucional. Em caso de dúvidas, procure a secretaria ou o professor responsável pela disciplina.
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 20px", fontSize: 11.5, color: "#7C857F", textAlign: "center", borderTop: "1px solid #D7DEDA" }}>
        Governo do Estado de Santa Catarina — Rede Estadual de Educação Profissional
      </div>
    </div>
  );
}

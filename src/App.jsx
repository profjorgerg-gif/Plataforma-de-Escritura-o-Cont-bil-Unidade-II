import { useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signOut,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase.js";
import TelaAcesso from "./components/layout/TelaAcesso.jsx";
import TelaConfirmarMatricula from "./components/layout/TelaConfirmarMatricula.jsx";
import ConfirmarAcessoAluno from "./components/layout/ConfirmarAcessoAluno.jsx";
import ConfirmarSenhaProfessor from "./components/layout/ConfirmarSenhaProfessor.jsx";
import Shell from "./components/layout/Shell.jsx";

// Fluxo real de autenticação — TODO MUNDO entra com a mesma conta Google
// (signInWithPopup); o que muda depois é o papel salvo em users/{uid}:
//
//   1. signInWithPopup(Google) → onAuthStateChanged → CRIA users/{uid}
//      automaticamente como papel "aluno" se o documento ainda não existir
//      (client-side, sem Cloud Function — seguro porque a regra do
//      Firestore só permite criar com papel "aluno"; virar professor/admin
//      é sempre manual, uma vez, direto no Console).
//   2. ALUNO: TelaConfirmarMatricula (só na 1ª vez, vincula a matrícula ao
//      uid) → depois disso, TODA vez que entra, ConfirmarAcessoAluno pede a
//      mesma matrícula de novo, como confirmação extra (protege contra
//      alguém continuar numa sessão Google esquecida aberta no computador
//      da escola).
//   3. PROFESSOR/ADMIN: TODA vez que entra, ConfirmarSenhaProfessor pede uma
//      senha guardada em configuracao/professor — mesma ideia de proteção
//      extra, só que com uma senha em vez da matrícula.

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null); // objeto do Firebase Auth
  const [perfil, setPerfil] = useState(null); // users/{uid} do Firestore
  // Gates de confirmação por sessão — nunca persistidos, por isso voltam a
  // pedir a cada novo login (resetados sempre que o uid muda).
  const [acessoAlunoConfirmado, setAcessoAlunoConfirmado] = useState(false);
  const [acessoProfessorConfirmado, setAcessoProfessorConfirmado] = useState(false);
  // Antes não existia tratamento de erro aqui: se getDoc/setDoc falhasse
  // (ex.: permissão negada, rede instável), a tela ficava presa para sempre
  // em "Preparando seu acesso…", sem nenhuma mensagem — impossível saber o
  // que realmente travou. Agora qualquer falha aparece nesta tela de erro,
  // com o motivo técnico e um botão para tentar de novo.
  const [erroAcesso, setErroAcesso] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      setAcessoAlunoConfirmado(false);
      setAcessoProfessorConfirmado(false);
      setErroAcesso("");
      if (u) {
        try {
          const ref = doc(db, "users", u.uid);
          let snap = await getDoc(ref);
          if (!snap.exists()) {
            await setDoc(ref, {
              nome: u.displayName || "",
              email: (u.email || "").toLowerCase(),
              papel: "aluno",
              turmaId: null,
              matricula: null,
              matriculaConfirmada: false,
              criadoEm: new Date().toISOString(),
            });
            snap = await getDoc(ref);
          }
          setPerfil(snap.data());
        } catch (e) {
          setErroAcesso((e.message || e.code || "erro desconhecido") + "");
          setPerfil(null);
        }
      } else {
        setPerfil(null);
      }
      setCarregando(false);
    });
    return unsub;
  }, []);

  async function tentarDeNovo() {
    setErroAcesso("");
    setCarregando(true);
    window.location.reload();
  }

  async function entrarComGoogle() {
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged cuida do resto.
  }

  async function sair() {
    await signOut(auth);
  }

  async function confirmarMatricula(matricula, turmaId) {
    // Verificação mínima do lado do cliente — a regra do Firestore é quem
    // de fato garante que isso só pode ser feito uma vez (uid ainda nulo
    // no documento do aluno) e que só estes três campos mudam.
    await updateDoc(doc(db, "users", usuario.uid), {
      matricula,
      turmaId,
      matriculaConfirmada: true,
    });
    await updateDoc(doc(db, "turmas", turmaId, "alunos", matricula), {
      uid: usuario.uid,
    });
    const snap = await getDoc(doc(db, "users", usuario.uid));
    setPerfil(snap.data());
  }

  if (carregando) {
    return <div className="empty-state">Carregando…</div>;
  }

  if (!usuario) {
    return <TelaAcesso onEntrarGoogle={entrarComGoogle} />;
  }

  if (erroAcesso) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EEF1EF", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        <div style={{ width: 460, maxWidth: "100%", background: "#ffffff", border: "1px solid #D7DEDA", boxShadow: "0 8px 28px rgba(20,30,24,0.08)", padding: "40px 36px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "#5C6660", textTransform: "uppercase", marginBottom: 10 }}>Não foi possível preparar o acesso</div>
          <h1 style={{ margin: "0 0 10px 0", fontFamily: "'Lora', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#0B2A1C" }}>Algo deu errado</h1>
          <p style={{ margin: "0 0 14px 0", fontSize: 13.5, color: "#6B746E", lineHeight: 1.6 }}>
            Tente novamente. Se continuar, mostre esta mensagem ao professor — ela indica o motivo técnico.
          </p>
          <div style={{ background: "#FBEAEA", border: "1px solid #E3B4B4", color: "#8A2A2A", padding: "10px 12px", fontSize: 13, marginBottom: 18, wordBreak: "break-word" }}>
            {erroAcesso}
          </div>
          <button
            onClick={tentarDeNovo}
            style={{ width: "100%", padding: 14, background: "#0B5D3B", border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}
          >
            Tentar novamente
          </button>
          <button
            onClick={sair}
            style={{ width: "100%", padding: 10, background: "none", border: "none", color: "#6B746E", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          >
            Sair / trocar de conta
          </button>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return <div className="empty-state">Preparando seu acesso…</div>;
  }

  if (perfil.papel === "aluno" && !perfil.matriculaConfirmada) {
    return <TelaConfirmarMatricula usuario={usuario} onConfirmar={confirmarMatricula} onSair={sair} />;
  }

  // Depois de já ter matrícula vinculada, o aluno confirma a matrícula de
  // novo A CADA login.
  if (perfil.papel === "aluno" && perfil.matriculaConfirmada && !acessoAlunoConfirmado) {
    return (
      <ConfirmarAcessoAluno
        usuario={usuario}
        matriculaEsperada={perfil.matricula}
        onConfirmar={() => setAcessoAlunoConfirmado(true)}
        onSair={sair}
      />
    );
  }

  // Professor/admin confirma uma senha extra A CADA login.
  if ((perfil.papel === "professor" || perfil.papel === "admin") && !acessoProfessorConfirmado) {
    return (
      <ConfirmarSenhaProfessor
        usuario={usuario}
        onConfirmar={() => setAcessoProfessorConfirmado(true)}
        onSair={sair}
      />
    );
  }

  return <Shell usuario={usuario} perfil={perfil} onSair={sair} />;
}

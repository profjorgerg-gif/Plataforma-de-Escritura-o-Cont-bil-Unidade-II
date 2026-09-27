import { useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase.js";
import TelaAcesso from "./components/layout/TelaAcesso.jsx";
import TelaConfirmarMatricula from "./components/layout/TelaConfirmarMatricula.jsx";
import Shell from "./components/layout/Shell.jsx";

// Fluxo real de autenticação — dois caminhos separados, escolhidos na
// TelaAcesso ("Aluno(a)" ou "Professor(a)"):
//
//   ALUNO:     signInWithPopup(Google) → onAuthStateChanged → CRIA
//              users/{uid} automaticamente (papel "aluno") se não existir →
//              TelaConfirmarMatricula (1ª vez) → Shell.
//   PROFESSOR: signInWithEmailAndPassword (e-mail + senha só do professor,
//              nunca via conta Google) → onAuthStateChanged → o documento
//              users/{uid} TEM que já existir, criado manualmente pelo
//              professor no Console Firebase com papel "professor" — nunca
//              é criado automaticamente aqui. Isso é o que garante que
//              ninguém "vira professor" sozinho: só quem sabe a senha
//              específica dessa conta (que não é a conta Google de
//              ninguém) chega nessa tela, e mesmo assim só entra se o
//              documento já foi preparado à mão.
//
// A criação do documento do ALUNO acontece no cliente, sem Cloud Function
// (plano Spark, sem custo) — segura porque a regra do Firestore (allow
// create em /users/{uid}) só permite criar com papel "aluno".

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null); // objeto do Firebase Auth
  const [perfil, setPerfil] = useState(null); // users/{uid} do Firestore
  const [avisoAcesso, setAvisoAcesso] = useState(""); // mensagem para a TelaAcesso (ex.: erro de login)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        const viaSenha = u.providerData.some((p) => p.providerId === "password");
        const ref = doc(db, "users", u.uid);
        let snap = await getDoc(ref);
        if (!snap.exists()) {
          if (viaSenha) {
            // Conta de professor sem documento preparado no Firestore —
            // nunca criar automaticamente aqui. Desloga e avisa.
            setAvisoAcesso(
              "Esta conta de professor ainda não foi configurada no Firestore. " +
              `Crie o documento em users/${u.uid} com papel "professor" e matriculaConfirmada: true.`
            );
            await signOut(auth);
            setCarregando(false);
            return;
          }
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
      } else {
        setPerfil(null);
      }
      setCarregando(false);
    });
    return unsub;
  }, []);

  async function entrarComGoogle() {
    setAvisoAcesso("");
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged cuida do resto.
  }

  async function entrarComEmailSenha(email, senha) {
    setAvisoAcesso("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      // onAuthStateChanged cuida do resto.
    } catch (e) {
      const mensagens = {
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/invalid-email": "E-mail inválido.",
        "auth/user-not-found": "Não existe uma conta de professor com esse e-mail.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/too-many-requests": "Muitas tentativas — aguarde um pouco e tente de novo.",
      };
      setAvisoAcesso(mensagens[e.code] || "Não foi possível entrar: " + (e.message || e.code));
    }
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
    return <TelaAcesso onEntrarGoogle={entrarComGoogle} onEntrarProfessor={entrarComEmailSenha} aviso={avisoAcesso} />;
  }

  if (!perfil) {
    return <div className="empty-state">Preparando seu acesso…</div>;
  }

  if (perfil.papel === "aluno" && !perfil.matriculaConfirmada) {
        return <TelaConfirmarMatricula usuario={usuario} onConfirmar={confirmarMatricula} onSair={sair} />;
  }

  return <Shell usuario={usuario} perfil={perfil} onSair={sair} />;
}

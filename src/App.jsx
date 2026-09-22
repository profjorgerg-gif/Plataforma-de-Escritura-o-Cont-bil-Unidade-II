import { useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signOut,
} from "firebase/auth";
import {
  doc, getDoc, updateDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase.js";
import TelaAcesso from "./components/layout/TelaAcesso.jsx";
import TelaConfirmarMatricula from "./components/layout/TelaConfirmarMatricula.jsx";
import Shell from "./components/layout/Shell.jsx";

// Fluxo real de autenticação, substituindo o "login demonstrativo" do protótipo:
//
//   1. TelaAcesso        → signInWithPopup(auth, googleProvider)
//   2. onAuthStateChanged → carrega/cria users/{uid}
//   3. matriculaConfirmada == false → TelaConfirmarMatricula
//   4. matriculaConfirmada == true  → Shell (o app propriamente dito)
//
// A criação do documento users/{uid} e a definição do campo "papel" NÃO
// acontecem aqui — por segurança, isso é responsabilidade de uma Cloud
// Function (auth trigger), conforme a nota em firestore.rules. Este
// componente só LÊ o documento e, quando ainda não confirmada a matrícula,
// escreve os três campos que a regra permite (matricula, turmaId,
// matriculaConfirmada).

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null); // objeto do Firebase Auth
  const [perfil, setPerfil] = useState(null); // users/{uid} do Firestore

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setPerfil(snap.exists() ? snap.data() : null);
      } else {
        setPerfil(null);
      }
      setCarregando(false);
    });
    return unsub;
  }, []);

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
    return <TelaAcesso onEntrar={entrarComGoogle} />;
  }

  if (!perfil) {
    // users/{uid} ainda não existe — normalmente a Cloud Function de auth
    // trigger cria isso em segundos; um pequeno atraso aqui é esperado.
    return <div className="empty-state">Preparando seu acesso…</div>;
  }

  if (perfil.papel === "aluno" && !perfil.matriculaConfirmada) {
    return <TelaConfirmarMatricula usuario={usuario} onConfirmar={confirmarMatricula} />;
  }

  return <Shell usuario={usuario} perfil={perfil} onSair={sair} />;
}

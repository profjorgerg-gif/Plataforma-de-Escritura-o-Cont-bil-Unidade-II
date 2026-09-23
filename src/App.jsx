import { useEffect, useState } from "react";
import {
  onAuthStateChanged, signInWithPopup, signOut,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase.js";
import TelaAcesso from "./components/layout/TelaAcesso.jsx";
import TelaConfirmarMatricula from "./components/layout/TelaConfirmarMatricula.jsx";
import Shell from "./components/layout/Shell.jsx";

// Fluxo real de autenticação, substituindo o "login demonstrativo" do protótipo:
//
//   1. TelaAcesso        → signInWithPopup(auth, googleProvider)
//   2. onAuthStateChanged → carrega ou CRIA users/{uid} (ver nota abaixo)
//   3. matriculaConfirmada == false → TelaConfirmarMatricula
//   4. matriculaConfirmada == true  → Shell (o app propriamente dito)
//
// A criação do documento users/{uid} acontece aqui mesmo, no cliente —
// sem Cloud Function, para não depender do plano Blaze (pago). Isso é
// seguro porque a regra do Firestore (allow create em /users/{uid}) só
// permite criar com papel "aluno", matriculaConfirmada: false — nunca como
// professor/admin. Promover alguém a professor é manual, uma vez, direto
// no Console: Firestore → Dados → users → o documento da pessoa → trocar
// "papel" para "professor" e "matriculaConfirmada" para true.

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null); // objeto do Firebase Auth
  const [perfil, setPerfil] = useState(null); // users/{uid} do Firestore

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUsuario(u);
      if (u) {
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
    return <div className="empty-state">Preparando seu acesso…</div>;
  }

  if (perfil.papel === "aluno" && !perfil.matriculaConfirmada) {
    return <TelaConfirmarMatricula usuario={usuario} onConfirmar={confirmarMatricula} />;
  }

  return <Shell usuario={usuario} perfil={perfil} onSair={sair} />;
}

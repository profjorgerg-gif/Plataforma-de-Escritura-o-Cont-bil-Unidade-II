// Inicialização do Firebase — valores do projeto plataforma-ci-unidade-ii.
// Estes valores do SDK web NÃO são segredo (o Google os expõe publicamente
// em qualquer site que usa Firebase) — a segurança vem das regras do
// Firestore (firestore.rules), não de esconder isto.

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDjiLT14olFfprH7Xj21_07yRdB6IXJSTo",
  authDomain: "plataforma-ci-unidade-ii.firebaseapp.com",
  projectId: "plataforma-ci-unidade-ii",
  storageBucket: "plataforma-ci-unidade-ii.firebasestorage.app",
  messagingSenderId: "402551258413",
  appId: "1:402551258413:web:fe045b5044bc800dafa7a4",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Se a escola usa um domínio Google Workspace institucional, é possível
// restringir o login a esse domínio (opcional, mas recomendado):
// googleProvider.setCustomParameters({ hd: "sua-escola.edu.br" });

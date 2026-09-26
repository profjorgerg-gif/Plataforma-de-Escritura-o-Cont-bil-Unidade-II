import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { PLANO_CONTAS_OFICIAL } from "../data/planoContasOficial.js";

// Lê a coleção planoContas em tempo real. Antes do seed inicial, a coleção
// está vazia — nesse caso caímos de volta no array estático portado do
// protótipo (deFallback: true), para o app continuar utilizável enquanto
// isso não é feito. Uma vez seedada, o Firestore manda: contas novas que o
// professor criar pela tela aparecem sem precisar de deploy.
export function usePlanoContas() {
  const [estado, setEstado] = useState({ contas: null, deFallback: false }); // contas: null = carregando

  useEffect(() => {
    const ref = collection(db, "planoContas");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.empty) {
        setEstado({ contas: PLANO_CONTAS_OFICIAL, deFallback: true });
        return;
      }
      setEstado({ contas: snap.docs.map((d) => ({ codigo: d.id, ...d.data() })), deFallback: false });
    });
    return unsub;
  }, []);

  return estado;
}

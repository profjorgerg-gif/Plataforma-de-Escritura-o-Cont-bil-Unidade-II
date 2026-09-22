import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

export function useCatalogoDocumentos() {
  const [catalogo, setCatalogo] = useState(null); // null = carregando
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "documentosFiscais"), (snap) =>
      setCatalogo(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);
  return catalogo;
}

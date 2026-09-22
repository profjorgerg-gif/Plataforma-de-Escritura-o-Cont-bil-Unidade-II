import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

export function useTurmasDoProfessor(uid) {
  const [turmas, setTurmas] = useState(null); // null = carregando
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "turmas"), where("professorId", "==", uid));
    const unsub = onSnapshot(q, (snap) => setTurmas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [uid]);
  return turmas;
}

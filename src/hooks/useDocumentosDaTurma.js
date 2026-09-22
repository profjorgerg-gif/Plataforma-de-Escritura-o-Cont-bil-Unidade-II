import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where, documentId, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

// Lê turmas/{turmaId}.documentosIds e, a partir dela, os documentos
// correspondentes em documentosFiscais — o mesmo filtro que
// documentosDaTurma() fazia em memória no protótipo, agora via Firestore.
// where(documentId(), 'in', ids) aceita até 30 ids por consulta; para o
// tamanho de uma turma isso é mais que suficiente.
export function useDocumentosDaTurma(turmaId) {
  const [documentos, setDocumentos] = useState(null); // null = carregando

  useEffect(() => {
    if (!turmaId) return;
    const unsubTurma = onSnapshot(doc(db, "turmas", turmaId), async (turmaSnap) => {
      const ids = turmaSnap.data()?.documentosIds || [];
      if (ids.length === 0) { setDocumentos([]); return; }
      const q = query(collection(db, "documentosFiscais"), where(documentId(), "in", ids.slice(0, 30)));
      const snap = await getDocs(q);
      setDocumentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubTurma;
  }, [turmaId]);

  return documentos;
}

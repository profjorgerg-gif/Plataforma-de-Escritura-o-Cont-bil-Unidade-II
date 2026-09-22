import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase.js";

const EMPRESA_NOME = "Comércio Têxtil Horizonte Ltda (didática)";

export default function EmpresaDidatica({ usuario, perfil }) {
  const [turmaNome, setTurmaNome] = useState("");

  useEffect(() => {
    if (!perfil.turmaId) return;
    const unsub = onSnapshot(doc(db, "turmas", perfil.turmaId), (snap) => setTurmaNome(snap.data()?.nome || ""));
    return unsub;
  }, [perfil.turmaId]);

  return (
    <>
      <div className="screen-eyebrow">02 · empresa didática</div>
      <h2 className="screen-title">{EMPRESA_NOME}</h2>
      <p className="screen-sub">Empresa fictícia vinculada à sua matrícula. Todos os fatos contábeis da Unidade II são acumulados aqui, formando um ciclo contábil completo.</p>
      <div className="panel">
        <div className="panel-body">
          <div className="grid-2">
            <div>
              <div className="field">
                <label>Aluno responsável</label>
                <div>{usuario.displayName || usuario.email} — matrícula {perfil.matricula}</div>
              </div>
            </div>
            <div>
              <div className="field">
                <label>Turma</label>
                <div>{turmaNome || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

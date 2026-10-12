import { PODC } from "../../lib/menuPodc.js";
import { RESERVA_TEXTO, DESCONTO_ATRASO } from "../../lib/avaliacao.js";

// Telas de orientação do aluno (2026-10-12). Só LEITURA e navegação: não gravam nada no Firestore.
// - InicioAluno: "Comece aqui" (onde estou, como funciona, as 6 etapas)
// - FaixaEtapa: linha "Etapa X de 6" no topo das telas de cada etapa
// - EtapaBloqueada: tela mostrada quando o aluno abre uma etapa que o professor ainda não liberou

const fmtPrazo = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const classeChip = (c) => (c === "ok" ? "ok" : c === "bad" ? "bad" : c === "warn" ? "warn" : c === "info" ? "ok" : "");
const chipStyle = (c) => (c === "gray" ? { background: "#ECE9E1", color: "#6B6A63" } : {});

function Chip({ e, texto }) {
  return <span className={"tag-pill " + classeChip(e.classe)} style={chipStyle(e.classe)}>{texto || e.rotulo}</span>;
}

export default function InicioAluno({ etapas, mostrarPi, onIr, nome }) {
  const atual = etapas.find((e) => e.atual) || etapas[0];
  const primeiraTela = (e) => (e.id === "f1" ? "dashboard" : e.itens[0].key);
  const destinos = {
    P: mostrarPi ? "etapas" : "roteiro",
    O: "plano",
    D: primeiraTela(atual),
    C: "dashboard",
  };
  const explicacao = {
    P: "Veja as etapas, os prazos e o que será avaliado.",
    O: "Reúna o que precisa para trabalhar: plano de contas e consultas.",
    D: "Faça as atividades da etapa em andamento, na ordem do menu.",
    C: "Confira seu progresso, suas notas e o retorno do professor.",
  };
  const proximo = atual.id === "f1"
    ? "Abra “Meu progresso” para ver qual passo da etapa 1 falta, e siga a ordem numerada do menu."
    : "Abra a primeira atividade da etapa e siga a ordem do menu.";

  return (
    <>
      <div className="screen-eyebrow">projeto interdisciplinar CI–CA–AGB</div>
      <h2 className="screen-title">Comece aqui</h2>
      <p className="screen-sub">{nome ? nome + ", este" : "Este"} é o mapa do seu trabalho: o que fazer, quando entregar e onde acompanhar o resultado.</p>

      <div className="balance-check ok" style={{ marginBottom: 18 }}>
        <b>Você está aqui:</b> etapa {atual.n} de {etapas.length} · {atual.titulo} · prazo {fmtPrazo(atual.prazo)} · {atual.rotulo}.
        <div style={{ marginTop: 6 }}>{proximo}</div>
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => onIr(primeiraTela(atual))}>Ir para a etapa {atual.n}</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Como o menu está organizado</h3></div>
        <div className="panel-body">
          <div className="kpi-row">
            {PODC.map((g) => (
              <div className="kpi" key={g.letra}>
                <div className="kpi-label mono">{g.letra} · {g.titulo}</div>
                <div style={{ fontSize: 13.5, margin: "4px 0 8px" }}>{explicacao[g.letra]}</div>
                <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(destinos[g.letra])}>Abrir</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3>Suas {etapas.length} etapas</h3></div>
        <div className="panel-body" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>#</th><th>Etapa</th><th>Disciplina</th><th>Prazo</th><th className="num">Aulas</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {etapas.map((e) => (
                <tr key={e.id} style={e.atual ? { background: "var(--amber-pale)" } : undefined}>
                  <td className="mono">{e.n}</td>
                  <td>{e.titulo}{e.atual && <b> ← você está aqui</b>}</td>
                  <td>{e.disc}</td>
                  <td className="mono">{fmtPrazo(e.prazo)}</td>
                  <td className="num">{e.aulas != null ? e.aulas : "—"}</td>
                  <td><Chip e={e} texto={e.curto} /></td>
                  <td>{e.disponivel && <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={() => onIr(primeiraTela(e))}>Abrir</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="helper-note">
        Cada etapa é liberada pelo professor depois de analisar a anterior. Etapas bloqueadas aparecem no menu para você ver o caminho, e abrem quando forem liberadas.
        Entregue pelo botão <b>Entregar</b> em “Meu roteiro por etapas”: entrega depois do prazo desconta {DESCONTO_ATRASO.toFixed(1).replace(".", ",")} pontos.
        As notas vão de 0,0 a 10,0, com retorno escrito sobre o que ajustar. {RESERVA_TEXTO ? "Reserva e recuperação: " + RESERVA_TEXTO + "." : ""}
      </div>
    </>
  );
}

export function FaixaEtapa({ info, total, onRoteiro, mostrarLink }) {
  if (!info) return null;
  return (
    <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
      <b style={{ color: "var(--ink)" }}>Etapa {info.n} de {total}</b>
      <span>{info.titulo}</span>
      <span>prazo {fmtPrazo(info.prazo)}</span>
      <Chip e={info} texto={info.curto} />
      {mostrarLink && <button className="btn secondary" style={{ padding: "1px 10px", fontSize: 12 }} onClick={onRoteiro}>Ver roteiro</button>}
    </div>
  );
}

export function EtapaBloqueada({ info, etapas, onIr, mostrarPi }) {
  const i = etapas.findIndex((e) => e.id === info.id);
  const anterior = i > 0 ? etapas[i - 1] : null;
  return (
    <>
      <div className="screen-eyebrow">etapa {info.n} de {etapas.length}</div>
      <h2 className="screen-title">{info.titulo}</h2>
      <div className="balance-check" style={{ marginBottom: 16 }}>
        🔒 <b>Esta etapa ainda não foi liberada pelo professor.</b> Ela abre depois que ele analisar a etapa anterior{anterior ? <> (<b>{anterior.titulo}</b>)</> : null}. Prazo previsto: {fmtPrazo(info.prazo)}.
      </div>
      {info.descricao && <p className="screen-sub">O que você vai fazer: {info.descricao}</p>}
      {info.entrega && <p className="screen-sub">Entrega: {info.entrega}.</p>}
      <p className="screen-sub">Atividades desta etapa: {info.itens.map((it) => it.label).join(" · ")}.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {mostrarPi && <button className="btn" onClick={() => onIr("etapas")}>Ver meu roteiro</button>}
        <button className="btn secondary" onClick={() => onIr("inicio")}>Voltar ao Comece aqui</button>
      </div>
    </>
  );
}


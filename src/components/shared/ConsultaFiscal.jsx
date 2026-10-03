import { useEffect, useState } from "react";

// Consulta CFOP/NCM (2026-10-03) — pedido do professor para os alunos
// pesquisarem dentro do próprio sistema, na hora da Análise fiscal (Passo 3
// do roteiro: "CFOP está correto? NCM está correto?"), em vez de precisar
// abrir outro site. Os dados vêm das tabelas oficiais (CFOP — Ajuste SINIEF;
// NCM vigente — Siscomex/Receita Federal) que o professor enviou, convertidas
// para JSON e publicadas em public/dados/.
//
// Por quê um fetch sob demanda, e não um array importado no código: a tabela
// de NCM tem mais de 15 mil linhas (~1,2 MB) — importar isso no JS faria
// TODO mundo baixar esse peso mesmo quem nunca abre esta tela. Como arquivo
// estático em public/, só é baixado por quem realmente clica em "NCM", e o
// Firebase Hosting serve isso de graça no plano Spark (é só um arquivo a
// mais, sem Cloud Function nem banco de dados envolvido).

const ABAS = [
  { key: "cfop", label: "CFOP", arquivo: "/dados/cfop.json" },
  { key: "ncm", label: "NCM", arquivo: "/dados/ncm.json" },
];

const LIMITE_RESULTADOS = 200;

function useTabelaFiscal(arquivo) {
  const [dados, setDados] = useState(null); // null = ainda não carregado
  const [erro, setErro] = useState("");
  useEffect(() => {
    setDados(null);
    setErro("");
    fetch(arquivo)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(setDados)
      .catch(() => setErro("Não foi possível carregar esta tabela agora. Tente novamente em instantes."));
  }, [arquivo]);
  return { dados, erro };
}

function AbaCfop({ arquivo }) {
  const { dados, erro } = useTabelaFiscal(arquivo);
  const [busca, setBusca] = useState("");

  if (erro) return <div className="balance-check bad">{erro}</div>;
  if (!dados) return <div className="empty-state">Carregando tabela de CFOP…</div>;

  const q = busca.trim().toLowerCase();
  const filtrados = !q ? dados : dados.filter(
    (c) => c.codigo.includes(q) || c.titulo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q)
  );
  const excedente = filtrados.length > LIMITE_RESULTADOS;
  const visiveis = filtrados.slice(0, LIMITE_RESULTADOS);

  return (
    <>
      <div className="field">
        <label>Buscar por código ou palavra (ex.: 5102, venda, devolução)</label>
        <input className="mono" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite para filtrar…" />
      </div>
      <div className="helper-note" style={{ marginBottom: 14 }}>
        {filtrados.length} código(s) encontrado(s){excedente ? ` — mostrando os primeiros ${LIMITE_RESULTADOS}, refine a busca para ver os demais` : ""}.
      </div>
      {visiveis.map((c) => (
        <div className="panel" key={c.codigo} style={{ marginBottom: 10 }}>
          <div className="panel-head">
            <h3 style={{ margin: 0 }}><span className="mono">{c.codigo}</span> — {c.titulo}</h3>
            {c.encerrado && <span className="tag-pill" style={{ background: "var(--red)", color: "#fff" }}>fora de vigência</span>}
          </div>
          <div className="panel-body"><p style={{ margin: 0 }}>{c.descricao}</p></div>
        </div>
      ))}
      {filtrados.length === 0 && <div className="empty-state">Nenhum CFOP encontrado para esta busca.</div>}
    </>
  );
}

function AbaNcm({ arquivo }) {
  const { dados, erro } = useTabelaFiscal(arquivo);
  const [busca, setBusca] = useState("");

  if (erro) return <div className="balance-check bad">{erro}</div>;
  if (!dados) return <div className="empty-state">Carregando tabela de NCM (são mais de 15 mil códigos, pode levar alguns segundos)…</div>;

  const q = busca.trim().toLowerCase();
  // Com 15 mil linhas, só filtra depois de pelo menos 2 caracteres — digitar
  // 1 letra sozinha devolveria milhares de linhas sem utilidade nenhuma.
  const pesquisando = q.length >= 2;
  const filtrados = !pesquisando ? [] : dados.filter(
    (n) => n.codigo.replace(/\D/g, "").includes(q.replace(/\D/g, "")) || n.descricao.toLowerCase().includes(q)
  );
  const excedente = filtrados.length > LIMITE_RESULTADOS;
  const visiveis = filtrados.slice(0, LIMITE_RESULTADOS);

  return (
    <>
      <div className="field">
        <label>Buscar por código (ex.: 8471.30.12) ou palavra da descrição (ex.: cadeira, caneta)</label>
        <input className="mono" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite ao menos 2 caracteres…" />
      </div>
      {!pesquisando && <div className="empty-state">Digite um código ou palavra para pesquisar entre os {dados.length.toLocaleString("pt-BR")} códigos de NCM.</div>}
      {pesquisando && (
        <>
          <div className="helper-note" style={{ marginBottom: 14 }}>
            {filtrados.length} código(s) encontrado(s){excedente ? ` — mostrando os primeiros ${LIMITE_RESULTADOS}, refine a busca para ver os demais` : ""}.
          </div>
          <div className="panel">
            <div className="panel-body" style={{ padding: 0 }}>
              <table>
                <thead><tr><th>Código</th><th>Descrição</th></tr></thead>
                <tbody>
                  {visiveis.map((n, i) => (
                    <tr key={n.codigo + "-" + i}>
                      <td className="mono">{n.codigo}</td>
                      <td>{n.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtrados.length === 0 && <div className="empty-state">Nenhum NCM encontrado para esta busca.</div>}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function ConsultaFiscal() {
  const [aba, setAba] = useState("cfop");
  const abaAtual = ABAS.find((a) => a.key === aba);

  return (
    <>
      <div className="screen-eyebrow">consulta</div>
      <h2 className="screen-title">Consulta CFOP / NCM</h2>
      <p className="screen-sub">
        Tabelas oficiais para pesquisar na hora da Análise fiscal (CFOP e NCM estão corretos para esta operação?).
        O sistema não indica a resposta certa — a pesquisa aqui é a mesma que você faria em qualquer fonte externa.
      </p>
      <div className="btn-row no-print" style={{ marginBottom: 18 }}>
        {ABAS.map((a) => (
          <button key={a.key} className={"btn" + (aba === a.key ? "" : " secondary")} onClick={() => setAba(a.key)}>
            {a.label}
          </button>
        ))}
      </div>
      {abaAtual.key === "cfop" && <AbaCfop arquivo={abaAtual.arquivo} />}
      {abaAtual.key === "ncm" && <AbaNcm arquivo={abaAtual.arquivo} />}
    </>
  );
}

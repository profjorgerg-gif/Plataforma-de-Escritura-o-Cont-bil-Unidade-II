import { useState } from "react";

// Painel "Como funciona esta etapa" (2026-10-09, pedido do professor).
// Fluxograma só informativo, no topo de cada tela do aluno. Não lê nem grava
// nada no banco. Abre sozinho na primeira visita a cada etapa; depois fica
// fechado (a escolha fica só no navegador do aluno, em localStorage).
// Tipos de caixa: al = você faz · sy = o sistema faz · pr = o professor faz · at = atenção.

const FLUXOS = {
  empresa: {
    titulo: "1 · Empresa didática",
    passos: [
      ["al", "1. Conheça a empresa", "é a empresa fictícia da sua matrícula; todos os fatos da Unidade II são acumulados nela"],
      ["al", "2. Siga a sequência", "use o menu na ordem numerada, de cima para baixo"],
      ["sy", "O sistema acumula", "tudo que você lança vai formando o ciclo contábil completo"],
    ],
  },
  documentos: {
    titulo: "2 · Documentos fiscais",
    passos: [
      ["pr", "O professor libera", "as notas fiscais (NF-e) da sua turma"],
      ["al", "1. Veja a lista", "números e tipos das notas disponíveis"],
      ["al", "2. Abra o PDF", "o conteúdo só aparece na etapa seguinte, ao digitar"],
      ["al", "3. Vá para a Digitação", "etapa 3 do menu"],
    ],
    aviso: ["at", "⚠ Achou algum documento faltando ou estranho? Abra um chamado em \"Suporte\"."],
  },
  digitacao: {
    titulo: "3 · Digitação e análise fiscal",
    partes: [
      { nome: "Parte A — digitar a nota", passos: [
        ["al", "1. Abra o PDF", "da nota que o professor liberou"],
        ["al", "2. Digite", "cabeçalho, itens e valor total, igual ao impresso"],
        ["al", "3. Salvar digitação", "fica gravado; sem salvar, ao sair você perde"],
        ["al", "4. Conferir digitação", "botão que pede a conferência"],
        ["sy", "Sistema compara", "soma dos itens e valor total com o gabarito"],
        ["ok", "✓ confere", "siga para a parte B"],
        ["at", "✗ diverge", "revise os valores e salve de novo. Se achar que o gabarito está errado: abra um chamado no Suporte"],
      ] },
      { nome: "Parte B — analisar a nota", passos: [
        ["al", "1. Julgue", "o CFOP, NCM e CST da nota estão corretos?"],
        ["al", "2. Justifique", "escreva o motivo da sua resposta"],
        ["al", "Salvar rascunho", "pode voltar depois e continuar"],
        ["al", "Enviar análise", "conclui esta etapa"],
        ["sy", "Sistema libera", "a Classificação contábil desta nota"],
        ["pr", "Professor", "pode devolver a análise: ela volta a rascunho, com orientação"],
      ] },
    ],
  },
  classificacao: {
    titulo: "4 · Classificação contábil",
    passos: [
      ["al", "1. Escolha a nota", "só aparecem notas digitadas com análise enviada"],
      ["al", "2. Descreva o fato", "e escolha conta a debitar, a creditar e valor"],
      ["al", "3. Salvar", "a classificação fica \"pendente\""],
      ["al", "4. Usar no lançamento", "leva os dados para o Livro diário"],
      ["sy", "Sistema marca", "\"lançada\" sozinho ao salvar o lançamento"],
    ],
    aviso: ["at", "⚠ Não clique em \"usar no lançamento\" duas vezes para o mesmo fato: isso cria lançamento repetido."],
  },
  diario: {
    titulo: "5 · Livro diário",
    passos: [
      ["al", "1. Novo lançamento", "ou venha da Classificação"],
      ["al", "2. Preencha", "data, documento, histórico e partidas (D e C)"],
      ["sy", "Débito = Crédito?", "o sistema confere na hora"],
      ["at", "Não", "não dá para enviar. Corrija ou salve como rascunho"],
      ["al", "Sim: Enviar para análise", "o professor passa a ver"],
      ["pr", "Aprovado ✓", "entra no Razão, Balancete, DRE e Balanço"],
      ["pr", "Devolvido", "leia a observação, edite e reenvie"],
    ],
    aviso: ["at", "⚠ Rascunho o professor não vê: só vale depois de \"Enviar\". Lançamento repetido em rascunho: use \"Excluir rascunho\"."],
  },
};
const AUTOMATICA = {
  titulo: "6 a 10 · Resultado automático",
  passos: [
    ["sy", "6 · Livro razão", "agrupa os lançamentos aprovados por conta"],
    ["sy", "7 · Balancete", "saldos das contas"],
    ["sy", "8 · ARE", "apuração do resultado do exercício"],
    ["sy", "9 · DRE", "demonstração do resultado"],
    ["sy", "10 · Balanço patrimonial", "ativo = passivo + patrimônio líquido"],
  ],
  aviso: ["al", "Aqui você não digita nada: se algo estiver errado, volte ao 5 · Livro diário e corrija o lançamento."],
};
const TITULOS_AUTOMATICOS = { razao: "6 · Livro razão", balancete: "7 · Balancete", are: "8 · ARE", dre: "9 · DRE", bp: "10 · Balanço patrimonial" };
["razao", "balancete", "are", "dre", "bp"].forEach((k) => { FLUXOS[k] = { ...AUTOMATICA, titulo: TITULOS_AUTOMATICOS[k] + " (etapas 6 a 10 são automáticas)" }; });

const COR = {
  al: ["#E5EFEA", "#1F5C4A"], sy: ["#EEEDEA", "#8a8678"], pr: ["#FBF1DC", "#9C6B1F"], at: ["#F5E1E1", "#8C2F2F"], ok: ["#E5EFEA", "#1F5C4A"],
};

function Caixa({ p }) {
  const [tipo, titulo, texto] = p;
  const [bg, borda] = COR[tipo] || COR.sy;
  return (
    <div style={{ background: bg, border: "2px solid " + borda, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.3, width: 150, flex: "0 0 auto" }}>
      <b style={{ display: "block", marginBottom: 2 }}>{titulo}</b>{texto}
    </div>
  );
}

function Linha({ passos }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 6, margin: "8px 0" }}>
      {passos.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Caixa p={p} />
          {i < passos.length - 1 && <span style={{ fontSize: 20, color: "#6b665a" }}>➜</span>}
        </div>
      ))}
    </div>
  );
}

function jaViu(etapa) {
  try { return localStorage.getItem("fluxoEtapa_" + etapa) === "1"; } catch (e) { return false; }
}
function marcarVisto(etapa) {
  try { localStorage.setItem("fluxoEtapa_" + etapa, "1"); } catch (e) { /* sem armazenamento: tudo bem */ }
}

export default function FluxoEtapa({ etapa }) {
  const fluxo = FLUXOS[etapa];
  const [aberto, setAberto] = useState(() => {
    const primeira = !jaViu(etapa);
    if (primeira) marcarVisto(etapa);
    return primeira;
  });
  if (!fluxo) return null;
  return (
    <div className="panel no-print" style={{ marginBottom: 14 }}>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>🧭 Como funciona esta etapa — {fluxo.titulo}</h3>
        <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setAberto(!aberto)}>{aberto ? "fechar" : "abrir"}</button>
      </div>
      {aberto && (
        <div className="panel-body">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, marginBottom: 4 }}>
            {[["al", "você faz"], ["sy", "o sistema faz"], ["pr", "o professor faz"], ["at", "atenção"]].map(([t, r]) => (
              <span key={t}><i style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: COR[t][0], border: "1px solid " + COR[t][1], marginRight: 5 }} />{r}</span>
            ))}
          </div>
          {fluxo.partes
            ? fluxo.partes.map((pt) => (
                <div key={pt.nome}><div className="mono" style={{ fontSize: 12, marginTop: 8, color: "var(--amber)" }}>{pt.nome}</div><Linha passos={pt.passos} /></div>
              ))
            : <Linha passos={fluxo.passos} />}
          {fluxo.aviso && <Caixa2 a={fluxo.aviso} />}
        </div>
      )}
    </div>
  );
}

function Caixa2({ a }) {
  const [bg, borda] = COR[a[0]];
  return <div style={{ background: bg, border: "2px solid " + borda, borderRadius: 8, padding: "8px 10px", fontSize: 12.5, marginTop: 6 }}>{a[1]}</div>;
}

// Exportações para a aba "Caminho do aluno" do Guia do professor (somente leitura).
export { FLUXOS, COR, Linha, Caixa2 };

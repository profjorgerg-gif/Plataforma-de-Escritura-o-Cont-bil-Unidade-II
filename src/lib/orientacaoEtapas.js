// Orientação por aluno nas etapas 2 a 6 (pedido do professor, 13/11/2026), no mesmo formato da orientação da Etapa 1.
// Regras fixas, calculadas no navegador: sem IA e sem Cloud Functions. Não entrega o gabarito: diz O QUE conferir e ONDE.
import { fmtNota } from "./avaliacao.js";

export const NOTA_OK = 7; // critério automático com nota abaixo disto entra na orientação

// critério automático -> o que fazer e onde (menu do aluno)
const ORIENT = {
  fp: {
    calculos: ["Há linhas do contracheque que não conferem. Refaça as linhas marcadas com ✗, na ordem do contracheque (remuneração, faltas, INSS, base do IRRF, IRRF, salário-família, vale-transporte e totais). Os totais só conferem se as linhas de cima estiverem certas.", "Etapa 2 · Folha de pagamento → Atividade · Elaborar a folha"],
    quantidade: ["Faltam contracheques conferidos. A atividade pede um contracheque por empregado da lista.", "Etapa 2 · Folha de pagamento → Atividade · Elaborar a folha"],
  },
  ca: {
    calculos: ["Há cálculos da folha do mês, das provisões ou dos encargos que não conferem. Refaça os campos marcados com ✗.", "Etapa 3 → Folha do mês e Provisões e encargos"],
    lancamentos: ["Há lançamentos da folha sem conferir, sem enviar ou devolvidos para correção. Revise contas, lado D/C e valores, leve para o Livro diário e envie.", "Etapa 3 → Contabilização e Livro diário"],
    efeitos: ["As respostas de efeitos nas demonstrações estão incompletas.", "Etapa 3 → Efeitos nas demonstrações"],
  },
  resc: {
    calculo: ["Fatos, dados ou valores das verbas rescisórias não conferem. Revise os dados do caso e refaça o cálculo das verbas.", "Etapa 4 → Caso e direitos e Cálculo das verbas"],
    incidencias: ["As incidências (INSS, FGTS e IRRF) não conferem. Confira as bases de cada tributo.", "Etapa 4 → Incidências"],
    contab: ["A contabilização da rescisão está sem conferir, sem enviar ou devolvida para correção.", "Etapa 4 → Contabilização e Livro diário"],
    docs: ["Faltam documentos ou o prazo de pagamento da rescisão.", "Etapa 4 → Documentos e prazos"],
  },
  agb: {
    calculos: ["Há cálculos de análise vertical, horizontal, indicadores ou capital de giro que não conferem. Refaça os campos marcados com ✗.", "Etapa 5 → Análise vertical e horizontal, Indicadores e Capital de giro"],
    interpretacoes: ["Faltam interpretações. Escreva o que cada resultado significa para a empresa.", "Etapa 5 → Análise vertical e horizontal, Indicadores e Capital de giro"],
    parecer: ["O parecer final está incompleto. Preencha as 4 partes.", "Etapa 5 → Parecer e relatório final"],
  },
  comp: {
    exercicios: ["Há exercícios comparativos que não conferem ou estão em branco. Refaça os campos marcados com ✗.", "Etapa 6 → Exercícios comparativos"],
    parecer: ["O parecer comparativo está curto ou ausente. Desenvolva a comparação entre as empresas.", "Etapa 6 → Comparativo entre empresas"],
  },
};

// sug: { critério: nota|null } (sugestões automáticas); extra: itens específicos (ex.: contracheques) já prontos.
export function orientacaoEtapa({ etapa, aluno, sug, extra = [], fechada = false, nota = null }) {
  const itens = [];
  (etapa.criterios || []).filter((c) => c.tipo === "auto").forEach((c) => {
    const o = (ORIENT[etapa.id] || {})[c.key];
    if (!o) return;
    const v = sug ? sug[c.key] : null;
    if (v === null || v === undefined) itens.push({ criterio: c.nome, nota: null, orientacao: "Ainda não há o que conferir neste item. " + o[0], onde: o[1] });
    else if (v < NOTA_OK) itens.push({ criterio: c.nome, nota: v, orientacao: o[0], onde: o[1] });
  });
  extra.forEach((x) => itens.push(x));
  const nome = ((aluno && aluno.nome) || "").split(" ")[0] || "Olá";
  const L = [];
  L.push(`${nome}, segue a sua orientação da Etapa ${etapa.n}${etapa.titulo ? " — " + etapa.titulo : ""}.` + (nota !== null && nota !== undefined ? ` Nota ${fechada ? "da etapa" : "parcial"}: ${fmtNota(nota)}.` : ""));
  if (itens.length === 0) { L.push("", "Nenhuma pendência encontrada nos itens que o sistema confere. Continue assim!"); return { itens, texto: L.join("\n") }; }
  L.push("", "O que você precisa ajustar:");
  itens.forEach((a, i) => {
    L.push(`${i + 1}) ${a.criterio}${a.nota !== null && a.nota !== undefined ? " (nota " + fmtNota(a.nota) + ")" : ""}`);
    L.push(`   O que fazer: ${a.orientacao}`);
    if (a.onde) L.push(`   Onde: ${a.onde}`);
  });
  L.push("", "Qualquer dúvida, responda esta mensagem.", "Prof. Jorge");
  return { itens, texto: L.join("\n") };
}

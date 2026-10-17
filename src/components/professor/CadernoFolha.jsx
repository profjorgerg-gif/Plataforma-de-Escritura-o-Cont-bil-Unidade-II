import { Fragment, useEffect, useMemo, useState } from "react";
import { htmlCabecalho, turmasDoPI, lerEscolha, gravarEscolha, lerNomeProf, lerEscola, lerEscrito } from "../../lib/cabecalhosCadernos.js";
import EscolhaCabecalho from "./EscolhaCabecalho.jsx";
import { GabaritoEmpregado, GabaritoEtapa3 } from "./GabaritoCalculos.jsx";
import { createPortal } from "react-dom";
import { fmt } from "../../lib/contabil.js";
import { folhaEmUso, lancamentosDaFolha, nomeDoMes, CONTAS_NOVAS } from "../../lib/folha.js";
import { casoDoEmpregado, textoDoCaso, enunciadosLancamentos, opcoesDoEmpregado } from "../../lib/enunciadosCA.js";
import { calcularContracheque, empregadoDeCampos, PASSOS_CONTRACHEQUE, TABELAS_2026 } from "../../lib/folhaAtividade.js";
import { useAlunosReaisDaTurma } from "../../hooks/useAlunosDaTurma.js";
import { useCaTurma, salvarConfigCa } from "../../hooks/useCa.js";
import { usePlanoContas } from "../../hooks/usePlanoContas.js";

// 2026-10-17 — Caderno da Folha (etapas 2 e 3), SÓ PROFESSOR. Material impresso para o aluno seguir a folha e os lançamentos.
// Personalizado por aluno (o caso de cada empregado nasce da matrícula do aluno). Só lê; o único gravar é o botão
// "Atualizar lista" (mesma publicação da tela Atividade da folha: nomes dos alunos, mesmos nomes mantêm o mesmo código).
const T = TABELAS_2026;
const brl = (v) => fmt(Number(v) || 0);

const CSS = `
.cf-pg{background:#fff;color:#1d2630;border:1px solid #bbb;padding:16px 20px;margin:0 auto 12px;max-width:794px;font-size:12px;line-height:1.4;box-sizing:border-box}
.cf-pg h3{margin:0 0 4px;font-size:14.5px}.cf-pg h4{margin:8px 0 3px;font-size:12.5px}
.cf-cab{display:flex;justify-content:space-between;gap:10px;border-bottom:2px solid #1d2630;padding-bottom:5px;margin-bottom:8px;font-size:11px}
.cf-pg table{border-collapse:collapse;width:100%;font-size:11.5px}.cf-pg th,.cf-pg td{border:1px solid #999;padding:3px 6px;text-align:left;vertical-align:top}.cf-pg th{background:#eee}
.cf-pg .n{text-align:right;font-family:'IBM Plex Mono',monospace}.cf-pg .br{height:19px}
.cf-pg .gab{text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:700;color:#1f5c4a}
.cf-caso{border:1px solid #1d2630;padding:5px 8px;margin:5px 0;font-size:12px}
.cf-rod{border-top:1px solid #999;margin-top:10px;padding-top:4px;font-size:10.5px;display:flex;justify-content:space-between;gap:10px}
.cf-ficha{break-inside:avoid;margin-bottom:12px}
.cf-pg tr.gt td{font-weight:700;background:#f3f6f4}
.cf-lin{display:flex;flex-direction:column;margin-top:6px}.cf-lin div{height:8.2mm;border-bottom:1px solid #999}
.cf-capa{padding-top:22px}.cf-capa-t{font:700 13px 'IBM Plex Sans',sans-serif;letter-spacing:.14em;color:#1f5c4a;margin-top:70px}
.cf-capa-h{font:700 38px Georgia,serif;margin:6px 0 8px}.cf-capa-s{font-size:14px;margin-bottom:46px}
.cf-capa-c{display:flex;gap:10px;border-bottom:1px solid #777;padding:6px 0;margin:8px 0;font-size:14px}.cf-capa-c b{min-width:110px}
.cf-capa-v{display:inline-block;border:2px solid #9c1c1c;color:#9c1c1c;padding:3px 10px;font-weight:700;margin-top:22px}
#imp-caderno-folha{display:none}
@media print{
  body>*:not(#imp-caderno-folha){display:none!important}
  #imp-caderno-folha{display:block!important;background:#fff}
  #imp-caderno-folha .cf-pg{border:0;margin:0;padding:0;max-width:none;break-after:page}
  #imp-caderno-folha>div:last-of-type .cf-pg:last-child{break-after:auto}
}
@page{size:A4;margin:12mm}
`;

function nomeConta(cod, contas) {
  const c = (contas || []).find((x) => x.codigo === cod) || CONTAS_NOVAS.find((x) => x.codigo === cod);
  return cod + (c ? " " + c.nome : "");
}

function Cab({ titulo, sub, aluno, turmaNome, comp, listaEm }) {
  return (
    <div className="cf-cab">
      <div><b>Projeto Interdisciplinar CI–CA–AGB · Caderno da Folha</b><br />{titulo}{sub ? " · " + sub : ""}<br />{turmaNome} · competência {comp}</div>
      <div style={{ textAlign: "right" }}><b>{aluno ? aluno.nome : "Aluno: ____________________"}</b><br />Matrícula {aluno ? aluno.matricula : "____________"}<br />Lista de {listaEm}</div>
    </div>
  );
}
const Rod = ({ esq, dir }) => <div className="cf-rod"><span>{esq}</span><span>{dir}</span></div>;

// Páginas de UM aluno (aluno = null: caderno em branco)
function PaginasAluno({ aluno, empregados, cfg, folha, contas, turmaNome, turmasPI, comResp, listaEm, capaCab, professor, nLinhas }) {
  const f = useMemo(() => folhaEmUso(folha), [folha]);
  const comp = nomeDoMes(f.competencia) || f.competencia;
  const cab = (titulo, sub) => <Cab titulo={titulo} sub={sub} aluno={aluno} turmaNome={turmaNome} comp={comp} listaEm={listaEm} />;
  const gab = comResp ? "VERSÃO DO PROFESSOR · gabarito" : "Calcule aqui e depois digite no sistema, que confere";
  const fichas = empregados.map((e, i) => {
    const caso = aluno ? casoDoEmpregado(aluno.matricula, e.id, f.competencia, opcoesDoEmpregado(cfg, e.id)) : null;
    const c = caso ? calcularContracheque(empregadoDeCampos((k) => caso[k])) : null;
    const emp = caso ? empregadoDeCampos((k) => caso[k]) : null;
    return { e, i, caso, c, emp };
  });
  // Versão do professor: uma ficha por página, seguida da folha de gabarito dos cálculos do mesmo empregado.
  const porPag = comResp && !aluno ? 2 : 1;
  const pares = [];
  for (let i = 0; i < fichas.length; i += porPag) pares.push(fichas.slice(i, i + porPag));
  let pn = 1; // numeração sequencial das páginas (a capa não conta)
  const prox = () => ++pn;
  const folhaCalc = (titulo, sub) => (
    <div className="cf-pg">
      {cab(titulo, sub)}
      <h4>Folha de cálculos · {sub}</h4>
      <div className="cf-lin">{Array.from({ length: nLinhas }).map((_, k) => <div key={k} />)}</div>
      <Rod esq="Folha para os seus cálculos. Depois digite os resultados no sistema, que confere" dir={"Página " + prox()} />
    </div>
  );
  const rodGab = "Gabarito · versão do professor, não entregar aos alunos";
  const lanc = lancamentosDaFolha(f.provisoes);
  const enun = enunciadosLancamentos(folha);
  const pv = f.provisoes;
  const nL = lanc.length;
  const linhaBr = (k, v) => <td className={comResp ? "gab" : "br"} key={k}>{comResp ? brl(v) : ""}</td>;

  return (
    <>
      <div className="cf-pg cf-capa">
        {capaCab ? <div dangerouslySetInnerHTML={{ __html: capaCab }} /> : null}
        <div className="cf-capa-t">PROJETO INTERDISCIPLINAR CI–CA–AGB</div>
        <div className="cf-capa-h">Caderno da Folha</div>
        <div className="cf-capa-s">Etapas 2 e 3 · Folha de pagamento, provisões e contabilização</div>
        <div className="cf-capa-c"><b>Aluno(a)</b><span>{aluno ? aluno.nome : ""}</span></div>
        <div className="cf-capa-c"><b>Matrícula</b><span>{aluno ? aluno.matricula : ""}</span></div>
        {turmasPI.map((x) => <div className="cf-capa-c" key={x.sigla || "t"}><b>{x.sigla ? "Turma " + x.sigla : "Turma"}</b><span>{x.nome}</span></div>)}
        <div className="cf-capa-c"><b>Professor</b><span>{professor}</span></div>
        <div className="cf-capa-c"><b>Competência</b><span>{comp}</span></div>
        {comResp && <div className="cf-capa-v">VERSÃO DO PROFESSOR · com respostas</div>}
      </div>
      <div className="cf-pg">
        {cab("Como usar este caderno")}
        <h3>Como usar</h3>
        <ol style={{ margin: "4px 0 6px 18px", padding: 0 }}>
          <li>Etapa 2: faça uma ficha por empregado da lista, na ordem. Calcule neste caderno e depois digite no sistema, que confere.</li>
          <li>Etapa 3: faça a folha do mês, as provisões e os 6 lançamentos. As contas já estão indicadas; preencha os valores.</li>
          <li>Dúvida nos lançamentos? Consulte o Guia de lançamentos no sistema. Os prazos estão em Meu roteiro.</li>
        </ol>
        <h4>Os 10 passos do contracheque</h4>
        <table><thead><tr><th>Passo</th><th>Como calcular</th></tr></thead><tbody>
          {PASSOS_CONTRACHEQUE.map((p) => <tr key={p.k}><td>{p.nome}</td><td>{p.como}</td></tr>)}
        </tbody></table>
        <h4>Tabelas de {T.vigencia}</h4>
        <table><thead><tr><th>INSS (faixa até R$)</th><th className="n">Alíquota</th><th>IRRF (base até R$)</th><th className="n">Alíquota</th><th className="n">Parcela a deduzir</th></tr></thead><tbody>
          {T.irrf.map((r, i) => { const x = T.inss[i]; return (
            <tr key={i}><td>{x ? brl(x.ate) : "—"}</td><td className="n">{x ? (x.aliq * 100).toFixed(1).replace(".", ",") + "%" : ""}</td>
              <td>{r.ate === Infinity ? "acima" : brl(r.ate)}</td><td className="n">{(r.aliq * 100).toFixed(1).replace(".", ",") + "%"}</td><td className="n">{brl(r.ded)}</td></tr>); })}
        </tbody></table>
        <h4>INSS pela tabela com parcela a deduzir (cálculo rápido)</h4>
        <table><thead><tr><th>Salário de contribuição (até R$)</th><th className="n">Alíquota</th><th className="n">Parcela a deduzir</th></tr></thead><tbody>
          {(() => { let ac = 0; return T.inss.map((x, i) => { if (i > 0) ac += T.inss[i - 1].ate * (x.aliq - T.inss[i - 1].aliq); return (
            <tr key={i}><td>{brl(x.ate)}</td><td className="n">{(x.aliq * 100).toFixed(1).replace(".", ",") + "%"}</td><td className="n">{brl(Math.round((ac + 1e-9) * 100) / 100)}</td></tr>); }); })()}
        </tbody></table>
        <p style={{ margin: "4px 0 0" }}>Fórmula rápida: INSS = salário × alíquota da faixa − parcela a deduzir (pode diferir em centavos do cálculo por faixa). IRRF = base × alíquota − parcela a deduzir. Redução (Lei 15.270/2025): até R$ {brl(T.reducao.limiteIsento)} zera o imposto; de R$ {brl(T.reducao.limiteIsento)} a R$ {brl(T.reducao.limiteFim)}: {brl(T.reducao.a)} − {String(T.reducao.b).replace(".", ",")} × rendimento tributável; acima, sem redução.</p>
        <p style={{ margin: "4px 0 0" }}>Dedução por dependente R$ {brl(T.deducaoDependente)} · desconto simplificado R$ {brl(T.descontoSimplificado)} · salário-família R$ {brl(T.salarioFamilia.cota)} por filho até 14 anos (remuneração até R$ {brl(T.salarioFamilia.limite)}) · vale-transporte {T.vtPercentual}% do salário-base · FGTS {T.fgtsPercentual}%.</p>
        <Rod esq={"Lista com " + empregados.length + " empregados"} dir="Página 1" />
      </div>

      {pares.map((par, pi) => (
        <Fragment key={pi}>
        <div className="cf-pg">
          {cab("Etapa 2 · Contracheque", "fichas " + (pi * porPag + 1) + (par.length > 1 ? " e " + (pi * porPag + 2) : "") + " de " + empregados.length)}
          {par.map(({ e, i, caso, c }) => (
            <div className="cf-ficha" key={e.id}>
              <h4>Ficha {i + 1} de {empregados.length} · Empregado(a): {e.nome}</h4>
              <div className="cf-caso">{caso ? textoDoCaso(e.nome, caso, f.competencia, cfg.fpSugestao) : "Dados do caso: salário R$ ________ · adicional ________ · horas extras ________ · faltas ____ · dependentes ____ · vale-transporte ________"}</div>
              <table><thead><tr><th style={{ width: "58%" }}>Passo</th><th className="n">Seu cálculo</th><th style={{ width: "9%" }}>Confere?</th></tr></thead><tbody>
                {PASSOS_CONTRACHEQUE.map((p) => <tr key={p.k}><td>{p.nome}</td>{c ? linhaBr(p.k, p.v(c)) : <td className="br" />}<td /></tr>)}
              </tbody></table>
            </div>
          ))}
          <Rod esq={gab} dir={"Página " + prox()} />
        </div>
        {!comResp && par.map(({ e, i }) => <Fragment key={"c" + e.id}>{folhaCalc("Etapa 2 · Folha de cálculos", "ficha " + (i + 1) + " de " + empregados.length + " · Empregado(a): " + e.nome)}</Fragment>)}
        {comResp && aluno && par.map(({ e, i, emp, c }) => emp && c && (
          <div className="cf-pg" key={"g" + e.id}>
            {cab("Etapa 2 · Gabarito dos cálculos", "ficha " + (i + 1) + " de " + empregados.length)}
            <h4>Gabarito · Ficha {i + 1} · Empregado(a): {e.nome}</h4>
            <GabaritoEmpregado emp={emp} c={c} p={f.parametros} />
            <Rod esq={rodGab} dir={"Página " + prox()} />
          </div>
        ))}
        </Fragment>
      ))}

      <div className="cf-pg">
        {cab("Etapa 3 · Folha do mês")}
        <h3>Folha do mês e provisões</h3>
        <p>Carga horária {f.parametros.cargaHoraria} h · adicional noturno {Math.round(f.parametros.adicionalNoturno * 100)}% · DSR com {f.parametros.diasUteisDSR} dias úteis e {f.parametros.diasDescansoDSR} de descanso · INSS {f.parametros.inss}% · FGTS {f.parametros.fgts}% · RAT {f.parametros.rat}% · terceiros {f.parametros.terceiros}%.</p>
        <table><thead><tr><th>Empregado</th><th className="n">Salário</th><th className="n">Adicional</th><th className="n">Horas extras</th><th className="n">DSR</th><th className="n">Remuneração bruta</th></tr></thead><tbody>
          {f.calc.linhas.map((l, i) => <tr key={i}><td>{l.nome}</td><td className="n">{brl(l.salario)}</td>{linhaBr("a", l.adicional)}{linhaBr("h", l.horasExtras)}{linhaBr("d", l.dsr)}{linhaBr("b", l.bruta)}</tr>)}
          <tr><td colSpan={5}><b>Total da folha (remuneração)</b></td>{linhaBr("t", f.calc.total)}</tr>
        </tbody></table>
        <h4>Provisões do mês (a partir da remuneração de R$ {brl(f.remuneracao)})</h4>
        <table><thead><tr><th>Item</th><th className="n">Valor</th></tr></thead><tbody>
          {[["Salários e remunerações", pv.salarios], ["Férias (1/12)", pv.ferias], ["1/3 constitucional", pv.tercoFerias], ["Férias + 1/3", pv.feriasTotal], ["13º salário (1/12)", pv.decimo]].map(([n, v]) => <tr key={n}><td>{n}</td>{linhaBr(n, v)}</tr>)}
        </tbody></table>
        <h4>Encargos (INSS, FGTS, RAT e terceiros) sobre cada base</h4>
        <table><thead><tr><th>Base</th><th className="n">INSS</th><th className="n">FGTS</th><th className="n">RAT</th><th className="n">Terceiros</th><th className="n">Total</th></tr></thead><tbody>
          {[["Salários", pv.encSalarios], ["Férias + 1/3", pv.encFerias], ["13º salário", pv.enc13]].map(([n, e]) => <tr key={n}><td>{n}</td>{linhaBr(n + "i", e.inss)}{linhaBr(n + "f", e.fgts)}{linhaBr(n + "r", e.rat)}{linhaBr(n + "t", e.terceiros)}{linhaBr(n + "T", e.total)}</tr>)}
        </tbody></table>
        <Rod esq={gab} dir={"Página " + prox()} />
      </div>

      {!comResp && folhaCalc("Etapa 3 · Folha de cálculos", "folha do mês e provisões")}

      {comResp && aluno && (
        <div className="cf-pg">
          {cab("Etapa 3 · Gabarito dos cálculos", "folha do mês, provisões e lançamentos")}
          <h3>Gabarito · Etapa 3</h3>
          <GabaritoEtapa3 f={f} lanc={lanc} nomeConta={(cod) => nomeConta(cod, contas)} />
          <Rod esq={rodGab} dir={"Página " + prox()} />
        </div>
      )}

      {[0, 1, 2].map((g) => (
        <div className="cf-pg" key={g}>
          {cab("Etapa 3 · Lançamentos", "lançamentos " + (g * 2 + 1) + " e " + (g * 2 + 2) + " de " + nL)}
          {lanc.slice(g * 2, g * 2 + 2).map((l, k) => (
            <div className="cf-ficha" key={l.key}>
              <h4>Lançamento {g * 2 + k + 1} de {nL} · {l.titulo}</h4>
              <div className="cf-caso">{enun[l.key]}</div>
              <table><thead><tr><th>Conta (código e nome)</th><th className="n" style={{ width: "20%" }}>Débito</th><th className="n" style={{ width: "20%" }}>Crédito</th></tr></thead><tbody>
                {l.partidas.map((p, j) => (
                  <tr key={j}><td style={p.tipo === "C" ? { paddingLeft: 22 } : null}>{nomeConta(p.conta, contas)}</td>
                    {comResp && p.tipo === "D" ? <td className="gab">{brl(p.valor)}</td> : <td className="br" />}
                    {comResp && p.tipo === "C" ? <td className="gab">{brl(p.valor)}</td> : <td className="br" />}</tr>
                ))}
              </tbody></table>
            </div>
          ))}
          <Rod esq={comResp ? "VERSÃO DO PROFESSOR · gabarito" : "Contas indicadas; preencha os valores nas colunas de débito e crédito"} dir={"Página " + prox()} />
        </div>
      ))}

      <div className="cf-pg">
        {cab("Conferência")}
        <h3>Minha conferência</h3>
        <table><thead><tr><th>Atividade</th><th style={{ width: "14%" }}>Fiz</th><th style={{ width: "14%" }}>Bateu</th><th style={{ width: "34%" }}>O que corrigi</th></tr></thead><tbody>
          <tr><td>Etapa 2 · todos os contracheques ({empregados.length} fichas)</td><td /><td /><td /></tr>
          <tr><td>Etapa 3 · folha do mês</td><td /><td /><td /></tr>
          <tr><td>Etapa 3 · provisões e encargos</td><td /><td /><td /></tr>
          {lanc.map((l, i) => <tr key={l.key}><td>Etapa 3 · lançamento {i + 1}: {l.titulo}</td><td /><td /><td /></tr>)}
        </tbody></table>
        <p style={{ marginTop: 14 }}>Visto do professor: ______________________ &nbsp; Data: ____/____/______</p>
        <Rod esq="Guarde este caderno: ele ajuda na conferência e na revisão" dir={"Página " + prox()} />
      </div>
    </>
  );
}

export default function CadernoFolha({ turma, nomePadrao }) {
  const tid = turma ? turma.id : null;
  const alunos = useAlunosReaisDaTurma(tid);
  const ca = useCaTurma(tid);
  const { contas } = usePlanoContas();
  const [modo, setModo] = useState("aluno"); // branco | aluno | todos
  const [mat, setMat] = useState("");
  const [comResp, setComResp] = useState(false);
  const [escolhaCab, setEscolhaCab] = useState(() => lerEscolha("folha"));
  const [horiz, setHoriz] = useState(false); // orientação da página: vertical (padrão) ou horizontal
  const [msg, setMsg] = useState("");
  const [pedido, setPedido] = useState(null);

  const lista = useMemo(() => (alunos || []).filter((a) => (a.nome || "").trim()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [alunos]);
  const cfg = ca.config || {};
  const empregados = cfg.empregados || [];
  const listaEm = cfg.atualizadoEm ? new Date(cfg.atualizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
  const aluno = lista.find((a) => a.matricula === mat) || lista[0] || null;

  async function atualizar() {
    setMsg("atualizando…");
    try {
      const reais = lista;
      let prox = empregados.reduce((m, e) => Math.max(m, Number(String(e.id).slice(1)) || 0), 0);
      const nova = reais.map((a) => { const j = empregados.find((e) => e.nome === a.nome); return { id: j ? j.id : "e" + (++prox), nome: a.nome }; });
      await salvarConfigCa(tid, { empregados: nova, atualizadoEm: new Date().toISOString() });
      setMsg("✓ lista atualizada com " + nova.length + " empregados (os mesmos nomes mantêm o mesmo código)");
    } catch (e) { setMsg("✗ " + (e.message || e.code)); }
  }
  function imprimir() {
    const alvos = modo === "branco" ? [null] : modo === "todos" ? lista : [aluno];
    setPedido({ alvos, n: Date.now() });
  }

  useEffect(() => {
    if (!pedido) return undefined;
    const t0 = document.title;
    const alvo = pedido.alvos.length === 1 && pedido.alvos[0] ? pedido.alvos[0].nome : pedido.alvos.length > 1 ? "turma" : "em branco";
    document.title = "Caderno da Folha - " + alvo + (comResp ? " - professor" : "");
    const fim = () => { document.title = t0; setPedido(null); };
    window.addEventListener("afterprint", fim);
    const h = setTimeout(() => window.print(), 500);
    return () => { clearTimeout(h); window.removeEventListener("afterprint", fim); document.title = t0; };
  }, [pedido]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!turma) return <div className="empty-state">Crie ou selecione uma turma em "Turmas" primeiro.</div>;
  if (!alunos || ca.config === undefined || ca.folha === undefined) return <div className="empty-state">Carregando…</div>;
  const capaCab = htmlCabecalho(escolhaCab);
  const cabVazio = escolhaCab === "escola" ? !lerEscola().logo && !lerEscola().linhas.trim() : escolhaCab === "escrito" ? !lerEscrito().linhas.trim() : false;
  const comuns = { capaCab, professor: lerNomeProf(nomePadrao).trim(), empregados, cfg, folha: ca.folha, contas, nLinhas: horiz ? 15 : 27, turmasPI: turmasDoPI(turma), turmaNome: turmasDoPI(turma).map((x) => (x.sigla ? x.sigla + " " : "Turma ") + x.nome).join(" · "), comResp, listaEm };
  const paginas = (a) => <PaginasAluno aluno={a} {...comuns} />;

  return (
    <>
      <style>{CSS}{horiz ? ".cf-pg{max-width:1123px}" : ""}</style>
      <div className="screen-eyebrow">materiais · etapas 2 e 3</div>
      <h2 className="screen-title">Caderno da Folha (imprimir)</h2>
      <p className="screen-sub">Orientações, fichas dos empregados e lançamentos das etapas 2 e 3. Cada aluno recebe os casos dele. A lista de empregados são os nomes dos alunos da turma.</p>
      <div className="panel"><div className="panel-body">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <span><b>{empregados.length}</b> empregados · lista publicada em {listaEm} · <b>{lista.length}</b> alunos na turma</span>
          <button type="button" className="btn green" onClick={atualizar}>↻ Atualizar lista a partir dos alunos</button>
          {msg && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{msg}</span>}
        </div>
        {empregados.length !== lista.length && <p style={{ fontSize: 13, color: "var(--amber, #8a5a00)", margin: "0 0 8px" }}>A lista publicada tem {empregados.length} nomes e a turma tem {lista.length} alunos. Clique em Atualizar antes de imprimir.</p>}
        {empregados.length === 0 && <div className="empty-state">A lista de empregados ainda não foi publicada. Clique em "Atualizar lista a partir dos alunos".</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }} role="group" aria-label="O que imprimir">
          <span style={{ fontSize: 13 }}>Imprimir:</span>
          {[["branco", "Em branco (sem dados)"], ["aluno", "Um aluno"], ["todos", "Todos os alunos"]].map(([k, t]) => <button key={k} type="button" className={modo === k ? "btn" : "btn secondary"} aria-pressed={modo === k} onClick={() => setModo(k)}>{t}</button>)}
          {modo === "aluno" && <select value={aluno ? aluno.matricula : ""} onChange={(e) => setMat(e.target.value)} style={{ padding: "5px 8px" }}>{lista.map((a) => <option key={a.matricula} value={a.matricula}>{a.nome}</option>)}</select>}
        </div>
        <div style={{ marginBottom: 8 }}><EscolhaCabecalho value={escolhaCab} onChange={(v) => { setEscolhaCab(v); gravarEscolha("folha", v); }} vazio={cabVazio} /></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }} role="group" aria-label="Orientação da página">
          <span style={{ fontSize: 13 }}>Página:</span>
          <button type="button" className={!horiz ? "btn" : "btn secondary"} aria-pressed={!horiz} onClick={() => setHoriz(false)}>▯ Vertical</button>
          <button type="button" className={horiz ? "btn" : "btn secondary"} aria-pressed={horiz} onClick={() => setHoriz(true)}>▭ Horizontal</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Versão">
          <span style={{ fontSize: 13 }}>Versão:</span>
          <button type="button" className={!comResp ? "btn" : "btn secondary"} aria-pressed={!comResp} onClick={() => setComResp(false)}>Do aluno (sem respostas)</button>
          <button type="button" className={comResp ? "btn" : "btn secondary"} aria-pressed={comResp} onClick={() => setComResp(true)}>Do professor (com respostas)</button>
          <button type="button" className="btn green" disabled={empregados.length === 0 || (modo !== "branco" && lista.length === 0)} onClick={imprimir}>🖨 Imprimir / salvar PDF</button>
        </div>
        <p style={{ margin: "10px 0 0", padding: "6px 10px", background: "var(--green-pale, #e4eee9)", fontSize: 13.5 }} aria-live="polite">
          <b>Será impresso:</b> {modo === "branco" ? "caderno em branco" : modo === "todos" ? "todos os alunos (" + lista.length + ")" : "caderno de " + (aluno ? aluno.nome : "—")}
          {" · cabeçalho: " + (escolhaCab === "escola" ? "da escola" : escolhaCab === "escrito" ? "escrito" : "sem cabeçalho")}
          {" · página " + (horiz ? "horizontal" : "vertical")}{" · versão " + (comResp ? "do professor (com respostas)" : "do aluno (sem respostas)")}
        </p>
        {comResp && <p style={{ fontSize: 13, color: "var(--amber, #8a5a00)", margin: "8px 0 0" }}>A versão do professor traz o valor certo de cada linha. Não entregue esta versão aos alunos.</p>}
      </div></div>

      {empregados.length > 0 && (
        <div style={{ marginTop: 14, overflowX: "auto" }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Prévia {modo === "branco" ? "do caderno em branco" : modo === "todos" ? "do primeiro aluno (todos serão impressos)" : "do caderno de " + (aluno ? aluno.nome : "")}.</p>
          {paginas(modo === "branco" ? null : (modo === "todos" ? lista[0] : aluno))}
        </div>
      )}

      {pedido && createPortal(
        <div id="imp-caderno-folha"><style>{CSS}{horiz ? "@page{size:A4 landscape;margin:12mm}" : ""}</style>{pedido.alvos.map((a, i) => <div key={a ? a.matricula : "b" + i}>{paginas(a)}</div>)}</div>,
        document.body
      )}
    </>
  );
}

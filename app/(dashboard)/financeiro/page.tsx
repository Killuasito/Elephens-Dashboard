"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  runTransaction,
  doc,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import FormInput from "@/components/ui/FormInput";
import { useCollection, deleteDocument } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { Transacao, Produto, Cliente, ContaPagar, ContaReceber, Coluna } from "@/types";
import {
  FiPlus, FiX, FiTrendingUp, FiTrendingDown, FiDollarSign, FiLink,
  FiFilter, FiChevronDown, FiChevronUp, FiArrowDownCircle, FiArrowUpCircle,
  FiList, FiCheck, FiTrash2, FiDownload,
} from "react-icons/fi";

const colunas: Coluna[] = [
  { chave: "data", label: "Data" },
  { chave: "descricao", label: "Descrição" },
  { chave: "clienteNomeLabel", label: "Cliente" },
  { chave: "produtoNomeLabel", label: "Produto" },
  { chave: "categoria", label: "Categoria" },
  { chave: "tipoLabel", label: "Tipo" },
  { chave: "valorFormatado", label: "Valor" },
];

const formInicial = {
  descricao: "",
  tipo: "receita" as Transacao["tipo"],
  valor: "",
  categoria: "",
  data: "",
  produtoId: "",
  produtoNome: "",
  quantidade: "1",
  clienteId: "",
  clienteNome: "",
};

const formPagarInicial = {
  descricao: "",
  fornecedor: "",
  fornecedorId: "",
  valor: "",
  vencimento: "",
  categoria: "",
};

const formReceberInicial = {
  descricao: "",
  cliente: "",
  clienteId: "",
  valor: "",
  vencimento: "",
  categoria: "",
};

const selectClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

const thClass =
  "px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs";
const tdClass = "px-4 py-3 text-gray-700 dark:text-gray-300";

const hoje = new Date().toISOString().split("T")[0];

function statusEfetivoPagar(conta: ContaPagar): "pendente" | "pago" | "atrasado" {
  if (conta.status === "pago") return "pago";
  if (conta.vencimento < hoje) return "atrasado";
  return "pendente";
}

function statusEfetivoReceber(conta: ContaReceber): "pendente" | "recebido" | "atrasado" {
  if (conta.status === "recebido") return "recebido";
  if (conta.vencimento < hoje) return "atrasado";
  return "pendente";
}

function BadgePagar({ status }: { status: "pendente" | "pago" | "atrasado" }) {
  const map = {
    pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    pago: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    atrasado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const label = { pendente: "Pendente", pago: "Pago", atrasado: "Atrasado" };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function BadgeReceber({ status }: { status: "pendente" | "recebido" | "atrasado" }) {
  const map = {
    pendente: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    recebido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    atrasado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  const label = { pendente: "Pendente", recebido: "Recebido", atrasado: "Atrasado" };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function formatarData(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

type Aba = "extrato" | "pagar" | "receber";

export default function FinanceiroPage() {
  const { user } = useAuth();
  const { dados: transacoes, loading } = useCollection<Transacao>("financeiro");
  const { dados: produtos } = useCollection<Produto>("produtos");
  const { dados: clientes } = useCollection<Cliente>("clientes");
  const { dados: contasPagar, loading: loadingPagar } = useCollection<ContaPagar>("contas_pagar");
  const { dados: contasReceber, loading: loadingReceber } = useCollection<ContaReceber>("contas_receber");

  const [aba, setAba] = useState<Aba>("extrato");

  // ─── Extrato state ────────────────────────────────────────────
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  // ─── Contas a Pagar state ─────────────────────────────────────
  const [mostrarFormPagar, setMostrarFormPagar] = useState(false);
  const [formPagar, setFormPagar] = useState(formPagarInicial);
  const [salvandoPagar, setSalvandoPagar] = useState(false);
  const [erroPagar, setErroPagar] = useState<string | null>(null);
  const [filtroPagarStatus, setFiltroPagarStatus] = useState<"todos" | "pendente" | "pago" | "atrasado">("todos");

  // ─── Contas a Receber state ───────────────────────────────────
  const [mostrarFormReceber, setMostrarFormReceber] = useState(false);
  const [formReceber, setFormReceber] = useState(formReceberInicial);
  const [salvandoReceber, setSalvandoReceber] = useState(false);
  const [erroReceber, setErroReceber] = useState<string | null>(null);
  const [filtroReceberStatus, setFiltroReceberStatus] = useState<"todos" | "pendente" | "recebido" | "atrasado">("todos");

  // ─── Computed ─────────────────────────────────────────────────
  const temFiltroAtivo =
    filtroTipo !== "todos" || filtroCliente !== "" || filtroCategoria !== "" || filtroDataDe !== "" || filtroDataAte !== "";

  function limparFiltros() {
    setFiltroTipo("todos");
    setFiltroCliente("");
    setFiltroCategoria("");
    setFiltroDataDe("");
    setFiltroDataAte("");
  }

  const categoriasUnicas = useMemo(() => {
    const s = new Set(transacoes.map((t) => t.categoria).filter(Boolean));
    return Array.from(s).sort();
  }, [transacoes]);

  const clientesNasTransacoes = useMemo(() => {
    const s = new Set(transacoes.map((t) => t.clienteNome).filter(Boolean));
    return Array.from(s).sort();
  }, [transacoes]);

  const totalReceitas = transacoes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const totalAPagar = contasPagar
    .filter((c) => statusEfetivoPagar(c) !== "pago")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalAReceber = contasReceber
    .filter((c) => statusEfetivoReceber(c) !== "recebido")
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const formatarValor = (v: number) =>
    `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  // ─── Extrato handlers ─────────────────────────────────────────
  const handleSelecionarProduto = (produtoId: string) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) {
      setForm((p) => ({ ...p, produtoId: "", produtoNome: "", valor: "", categoria: "" }));
      return;
    }
    const qtd = parseInt(form.quantidade) || 1;
    setForm((p) => ({
      ...p,
      produtoId: produto.id,
      produtoNome: produto.nome,
      valor: (produto.preco * qtd).toFixed(2),
      categoria: produto.categoria,
    }));
  };

  const handleQuantidade = (qtdStr: string) => {
    const qtd = parseInt(qtdStr) || 1;
    const produto = produtos.find((p) => p.id === form.produtoId);
    setForm((p) => ({
      ...p,
      quantidade: qtdStr,
      valor: produto ? (produto.preco * qtd).toFixed(2) : p.valor,
    }));
  };

  const handleSelecionarCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    setForm((p) => ({ ...p, clienteId, clienteNome: cliente?.nome ?? "" }));
  };

  const handleSalvar = async () => {
    setErro(null);
    if (!form.descricao || !form.valor || !form.data) return;

    const valor = parseFloat(form.valor) || 0;
    const quantidade = parseInt(form.quantidade) || 1;
    const temProduto = !!form.produtoId && form.tipo === "receita";

    if (temProduto) {
      const produto = produtos.find((p) => p.id === form.produtoId);
      if (produto && produto.estoque < quantidade) {
        setErro(`Estoque insuficiente. Disponível: ${produto.estoque} unidade(s).`);
        return;
      }
    }

    setSalvando(true);
    try {
      const payload: Record<string, unknown> = {
        descricao: form.descricao,
        tipo: form.tipo,
        valor,
        categoria: form.categoria || "Geral",
        data: form.data,
        uid: user!.uid,
        criadoEm: serverTimestamp(),
      };
      if (form.clienteId) { payload.clienteId = form.clienteId; payload.clienteNome = form.clienteNome; }
      if (temProduto) { payload.produtoId = form.produtoId; payload.produtoNome = form.produtoNome; payload.quantidade = quantidade; }

      if (temProduto) {
        await runTransaction(db, async (transaction) => {
          const produtoRef = doc(db, "produtos", form.produtoId);
          const produtoSnap = await transaction.get(produtoRef);
          if (!produtoSnap.exists()) throw new Error("Produto não encontrado.");
          const estoqueAtual = Number(produtoSnap.data().estoque ?? 0);
          if (estoqueAtual < quantidade) throw new Error(`Estoque insuficiente. Disponível: ${estoqueAtual}.`);
          const novoEstoque = estoqueAtual - quantidade;
          const novoStatus = novoEstoque === 0 ? "esgotado" : produtoSnap.data().status;
          transaction.update(produtoRef, { estoque: novoEstoque, status: novoStatus, atualizadoEm: serverTimestamp() });
          const novoRef = doc(collection(db, "financeiro"));
          transaction.set(novoRef, payload);
        });
      } else {
        const novoRef = doc(collection(db, "financeiro"));
        await runTransaction(db, async (transaction) => { transaction.set(novoRef, payload); });
      }

      setForm(formInicial);
      setMostrarForm(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (item: Record<string, unknown>) => {
    if (confirm(`Deseja remover a transação "${item.descricao}"?`)) {
      await deleteDocument("financeiro", String(item.id));
    }
  };

  // ─── Contas a Pagar handlers ──────────────────────────────────
  const handleSalvarPagar = async () => {
    setErroPagar(null);
    if (!formPagar.descricao || !formPagar.valor || !formPagar.vencimento) {
      setErroPagar("Preencha descrição, valor e vencimento.");
      return;
    }
    setSalvandoPagar(true);
    try {
      const payload: Record<string, unknown> = {
        descricao: formPagar.descricao,
        fornecedor: formPagar.fornecedor || "",
        valor: parseFloat(formPagar.valor) || 0,
        vencimento: formPagar.vencimento,
        categoria: formPagar.categoria || "Geral",
        status: "pendente",
        uid: user!.uid,
        criadoEm: serverTimestamp(),
      };
      if (formPagar.fornecedorId) payload.fornecedorId = formPagar.fornecedorId;
      const novoRef = doc(collection(db, "contas_pagar"));
      await runTransaction(db, async (t) => { t.set(novoRef, payload); });
      setFormPagar(formPagarInicial);
      setMostrarFormPagar(false);
    } catch {
      setErroPagar("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvandoPagar(false);
    }
  };

  const marcarPago = async (id: string) => {
    await updateDoc(doc(db, "contas_pagar", id), { status: "pago" });
  };

  const handleDeletarPagar = async (conta: ContaPagar) => {
    if (confirm(`Remover "${conta.descricao}"?`)) {
      await deleteDocument("contas_pagar", conta.id);
    }
  };

  // ─── Contas a Receber handlers ────────────────────────────────
  const handleSalvarReceber = async () => {
    setErroReceber(null);
    if (!formReceber.descricao || !formReceber.valor || !formReceber.vencimento) {
      setErroReceber("Preencha descrição, valor e vencimento.");
      return;
    }
    setSalvandoReceber(true);
    try {
      const payload: Record<string, unknown> = {
        descricao: formReceber.descricao,
        cliente: formReceber.cliente || "",
        valor: parseFloat(formReceber.valor) || 0,
        vencimento: formReceber.vencimento,
        categoria: formReceber.categoria || "Geral",
        status: "pendente",
        uid: user!.uid,
        criadoEm: serverTimestamp(),
      };
      if (formReceber.clienteId) payload.clienteId = formReceber.clienteId;
      const novoRef = doc(collection(db, "contas_receber"));
      await runTransaction(db, async (t) => { t.set(novoRef, payload); });
      setFormReceber(formReceberInicial);
      setMostrarFormReceber(false);
    } catch {
      setErroReceber("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvandoReceber(false);
    }
  };

  const marcarRecebido = async (id: string) => {
    await updateDoc(doc(db, "contas_receber", id), { status: "recebido" });
  };

  const handleDeletarReceber = async (conta: ContaReceber) => {
    if (confirm(`Remover "${conta.descricao}"?`)) {
      await deleteDocument("contas_receber", conta.id);
    }
  };

  // ─── Extrato dados filtrados ──────────────────────────────────
  const dadosFiltrados = transacoes
    .filter((t) => {
      if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;
      if (filtroCliente && t.clienteNome !== filtroCliente) return false;
      if (filtroCategoria && t.categoria !== filtroCategoria) return false;
      if (filtroDataDe && t.data < filtroDataDe) return false;
      if (filtroDataAte && t.data > filtroDataAte) return false;
      return true;
    })
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .map((t) => ({
      ...t,
      tipoLabel: t.tipo === "receita" ? "Receita" : "Despesa",
      valorFormatado: formatarValor(Number(t.valor)),
      clienteNomeLabel: t.clienteNome || "—",
      produtoNomeLabel: t.produtoNome
        ? `${t.produtoNome}${t.quantidade && t.quantidade > 1 ? ` ×${t.quantidade}` : ""}`
        : "—",
    }));

  // ─── Contas a Pagar filtradas ─────────────────────────────────
  const contasPagarFiltradas = contasPagar
    .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""))
    .filter((c) => {
      if (filtroPagarStatus === "todos") return true;
      return statusEfetivoPagar(c) === filtroPagarStatus;
    });

  // ─── Contas a Receber filtradas ───────────────────────────────
  const contasReceberFiltradas = contasReceber
    .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""))
    .filter((c) => {
      if (filtroReceberStatus === "todos") return true;
      return statusEfetivoReceber(c) === filtroReceberStatus;
    });

  const produtosAtivos = produtos.filter((p) => p.status === "ativo" && p.estoque > 0);

  // ─── Exportar Excel (contabilidade) ──────────────────────────
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const dataExport = new Date().toLocaleDateString("pt-BR");
    const horaExport = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // ── Aba Resumo ────────────────────────────────────────────
    const totalReceitasFinal = transacoes.filter((t) => t.tipo === "receita").reduce((a, t) => a + Number(t.valor), 0);
    const totalDespesasFinal = transacoes.filter((t) => t.tipo === "despesa").reduce((a, t) => a + Number(t.valor), 0);
    const saldoFinal = totalReceitasFinal - totalDespesasFinal;
    const totalAPagarFinal = contasPagar.filter((c) => statusEfetivoPagar(c) !== "pago").reduce((a, c) => a + Number(c.valor), 0);
    const totalAReceberFinal = contasReceber.filter((c) => statusEfetivoReceber(c) !== "recebido").reduce((a, c) => a + Number(c.valor), 0);

    const resumoData = [
      ["RELATÓRIO FINANCEIRO", "", "", ""],
      [`Emitido em: ${dataExport} às ${horaExport}`, "", "", ""],
      [""],
      ["RESULTADO DO EXTRATO", "", "", ""],
      ["Indicador", "Valor (R$)", "", ""],
      ["Total de Receitas", totalReceitasFinal, "", ""],
      ["Total de Despesas", totalDespesasFinal, "", ""],
      ["Saldo (Receitas - Despesas)", saldoFinal, "", ""],
      [""],
      ["OBRIGAÇÕES E DIREITOS", "", "", ""],
      ["Indicador", "Valor (R$)", "Qtd. Itens", ""],
      ["Contas a Pagar (em aberto)", totalAPagarFinal, contasPagar.filter((c) => statusEfetivoPagar(c) !== "pago").length, ""],
      ["Contas a Receber (em aberto)", totalAReceberFinal, contasReceber.filter((c) => statusEfetivoReceber(c) !== "recebido").length, ""],
      ["Resultado Líquido Projetado", saldoFinal - totalAPagarFinal + totalAReceberFinal, "", ""],
      [""],
      ["RECEITAS POR CATEGORIA", "", "", ""],
      ["Categoria", "Total (R$)", "Qtd.", ""],
      ...Array.from(new Set(transacoes.filter((t) => t.tipo === "receita").map((t) => t.categoria))).sort().map((cat) => {
        const itens = transacoes.filter((t) => t.tipo === "receita" && t.categoria === cat);
        return [cat || "Geral", itens.reduce((a, t) => a + Number(t.valor), 0), itens.length, ""];
      }),
      [""],
      ["DESPESAS POR CATEGORIA", "", "", ""],
      ["Categoria", "Total (R$)", "Qtd.", ""],
      ...Array.from(new Set(transacoes.filter((t) => t.tipo === "despesa").map((t) => t.categoria))).sort().map((cat) => {
        const itens = transacoes.filter((t) => t.tipo === "despesa" && t.categoria === cat);
        return [cat || "Geral", itens.reduce((a, t) => a + Number(t.valor), 0), itens.length, ""];
      }),
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo["!cols"] = [{ wch: 38 }, { wch: 18 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // ── Aba Extrato ───────────────────────────────────────────
    const extratoRows = transacoes
      .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))
      .map((t) => ({
        Data: formatarData(t.data),
        Descrição: t.descricao,
        Tipo: t.tipo === "receita" ? "Receita" : "Despesa",
        Categoria: t.categoria || "Geral",
        "Cliente / Fornecedor": t.clienteNome || "—",
        Produto: t.produtoNome || "—",
        Quantidade: t.quantidade ?? "",
        "Valor (R$)": Number(t.valor),
        Débito: t.tipo === "despesa" ? Number(t.valor) : "",
        Crédito: t.tipo === "receita" ? Number(t.valor) : "",
      }));
    const wsExtrato = XLSX.utils.json_to_sheet(extratoRows, { header: ["Data", "Descrição", "Tipo", "Categoria", "Cliente / Fornecedor", "Produto", "Quantidade", "Valor (R$)", "Débito", "Crédito"] });
    wsExtrato["!cols"] = [{ wch: 12 }, { wch: 35 }, { wch: 10 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsExtrato, "Extrato");

    // ── Aba Contas a Pagar ────────────────────────────────────
    const pagarRows = contasPagar
      .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""))
      .map((c) => ({
        Vencimento: formatarData(c.vencimento),
        Descrição: c.descricao,
        Fornecedor: c.fornecedor || "—",
        Categoria: c.categoria || "Geral",
        "Valor (R$)": Number(c.valor),
        Status: statusEfetivoPagar(c) === "pago" ? "Pago" : statusEfetivoPagar(c) === "atrasado" ? "Atrasado" : "Pendente",
      }));
    const wsPagar = XLSX.utils.json_to_sheet(pagarRows, { header: ["Vencimento", "Descrição", "Fornecedor", "Categoria", "Valor (R$)", "Status"] });
    wsPagar["!cols"] = [{ wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsPagar, "Contas a Pagar");

    // ── Aba Contas a Receber ──────────────────────────────────
    const receberRows = contasReceber
      .sort((a, b) => (a.vencimento ?? "").localeCompare(b.vencimento ?? ""))
      .map((c) => ({
        Vencimento: formatarData(c.vencimento),
        Descrição: c.descricao,
        Cliente: c.cliente || "—",
        Categoria: c.categoria || "Geral",
        "Valor (R$)": Number(c.valor),
        Status: statusEfetivoReceber(c) === "recebido" ? "Recebido" : statusEfetivoReceber(c) === "atrasado" ? "Atrasado" : "Pendente",
      }));
    const wsReceber = XLSX.utils.json_to_sheet(receberRows, { header: ["Vencimento", "Descrição", "Cliente", "Categoria", "Valor (R$)", "Status"] });
    wsReceber["!cols"] = [{ wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsReceber, "Contas a Receber");

    const nomeArquivo = `financeiro_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const tabClass = (t: Aba) =>
    `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      aba === t
        ? "bg-blue-600 text-white shadow-sm"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <DashboardLayout titulo="Financeiro">
      <div className="space-y-6">

        {/* Abas de navegação */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setAba("extrato")} className={tabClass("extrato")}>
              <FiList size={15} /> Extrato
            </button>
            <button onClick={() => setAba("pagar")} className={tabClass("pagar")}>
              <FiArrowDownCircle size={15} /> Contas a Pagar
            </button>
            <button onClick={() => setAba("receber")} className={tabClass("receber")}>
              <FiArrowUpCircle size={15} /> Contas a Receber
            </button>
          </div>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            title="Exporta Extrato, Contas a Pagar e Contas a Receber em um único arquivo Excel"
          >
            <FiDownload size={15} /> Exportar Excel
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            ABA: EXTRATO
        ══════════════════════════════════════════════════════ */}
        {aba === "extrato" && (
          <>
            {/* Stats do extrato */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard titulo="Total Receitas" valor={formatarValor(totalReceitas)} icone={<FiTrendingUp />} cor="green" variacao={`${transacoes.filter((t) => t.tipo === "receita").length} lançamento(s)`} />
              <StatCard titulo="Total Despesas" valor={formatarValor(totalDespesas)} icone={<FiTrendingDown />} cor="red" variacao={`${transacoes.filter((t) => t.tipo === "despesa").length} lançamento(s)`} />
              <StatCard titulo="Saldo" valor={formatarValor(saldo)} icone={<FiDollarSign />} cor={saldo >= 0 ? "blue" : "amber"} variacao={saldo >= 0 ? "Positivo" : "Negativo"} />
            </div>

            {/* Barra de ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMostrarFiltros((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    mostrarFiltros || temFiltroAtivo
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <FiFilter size={14} />
                  Filtros
                  {temFiltroAtivo && (
                    <span className="ml-1 bg-white/30 rounded-full px-1.5 py-0.5 text-xs leading-none">
                      {[filtroTipo !== "todos", filtroCliente, filtroCategoria, filtroDataDe, filtroDataAte].filter(Boolean).length}
                    </span>
                  )}
                  {mostrarFiltros ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                </button>
                {temFiltroAtivo && (
                  <button onClick={limparFiltros} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Limpar
                  </button>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">{dadosFiltrados.length} resultado(s)</span>
              </div>
              <button
                onClick={() => { setForm(formInicial); setErro(null); setMostrarForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <FiPlus size={16} /> Novo Lançamento
              </button>
            </div>

            {/* Filtros expansível */}
            {mostrarFiltros && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Filtrar lançamentos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo</label>
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)} className={selectClass}>
                      <option value="todos">Todos</option>
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Cliente / Fornecedor</label>
                    <select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)} className={selectClass}>
                      <option value="">Todos</option>
                      {clientesNasTransacoes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Categoria</label>
                    <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={selectClass}>
                      <option value="">Todas</option>
                      {categoriasUnicas.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data — de</label>
                    <input type="date" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)} className={selectClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data — até</label>
                    <input type="date" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)} className={selectClass} />
                  </div>
                </div>
              </div>
            )}

            {/* Formulário novo lançamento */}
            {mostrarForm && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Novo Lançamento</h2>
                  <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FiX size={18} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FormInput label="Descrição" placeholder="Ex: Venda de camiseta azul" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                    <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as Transacao["tipo"], produtoId: "", produtoNome: "", quantidade: "1" }))} className={selectClass}>
                      <option value="receita">Receita</option>
                      <option value="despesa">Despesa</option>
                    </select>
                  </div>
                  <FormInput label="Data" type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} required />
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    <FiLink size={13} /> Vínculos opcionais
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {form.tipo === "receita" ? "Cliente" : "Fornecedor"}
                        <span className="ml-1 text-xs text-gray-400 font-normal">(opcional)</span>
                      </label>
                      <select value={form.clienteId} onChange={(e) => handleSelecionarCliente(e.target.value)} className={selectClass}>
                        <option value="">— Nenhum —</option>
                        {clientes.filter((c) => c.status === "ativo").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    {form.tipo === "receita" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Produto <span className="ml-1 text-xs text-gray-400 font-normal">(opcional — desconta estoque)</span>
                        </label>
                        <select value={form.produtoId} onChange={(e) => handleSelecionarProduto(e.target.value)} className={selectClass}>
                          <option value="">— Nenhum —</option>
                          {produtosAtivos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nome} — {formatarValor(p.preco)} (estoque: {p.estoque})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {form.produtoId && form.tipo === "receita" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade</label>
                        <input type="number" min="1" max={produtos.find((p) => p.id === form.produtoId)?.estoque ?? 99} value={form.quantidade} onChange={(e) => handleQuantidade(e.target.value)} className={selectClass} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label={form.produtoId ? "Valor (calculado automaticamente)" : "Valor (R$)"}
                    type="number" placeholder="0.00" value={form.valor}
                    onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                    readOnly={!!form.produtoId}
                    className={form.produtoId ? "opacity-70 cursor-not-allowed" : ""}
                    required
                  />
                  <FormInput label="Categoria" placeholder="Ex: Vendas, Aluguel..." value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))} />
                </div>
                {erro && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">{erro}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSalvar} disabled={salvando} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {salvando ? "Salvando..." : "Registrar"}
                  </button>
                  <button onClick={() => setMostrarForm(false)} className="px-5 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabela extrato */}
            {loading ? (
              <div className="text-sm text-gray-400 py-8 text-center">Carregando lançamentos...</div>
            ) : (
              <DataTable colunas={colunas} dados={dadosFiltrados} onDeletar={handleDeletar} />
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            ABA: CONTAS A PAGAR
        ══════════════════════════════════════════════════════ */}
        {aba === "pagar" && (
          <>
            {/* Stats contas a pagar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                titulo="Total em Aberto"
                valor={formatarValor(totalAPagar)}
                icone={<FiArrowDownCircle />}
                cor="red"
                variacao={`${contasPagar.filter((c) => statusEfetivoPagar(c) !== "pago").length} conta(s)`}
              />
              <StatCard
                titulo="Atrasadas"
                valor={formatarValor(contasPagar.filter((c) => statusEfetivoPagar(c) === "atrasado").reduce((s, c) => s + Number(c.valor), 0))}
                icone={<FiTrendingDown />}
                cor="amber"
                variacao={`${contasPagar.filter((c) => statusEfetivoPagar(c) === "atrasado").length} conta(s)`}
              />
              <StatCard
                titulo="Pagas"
                valor={formatarValor(contasPagar.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0))}
                icone={<FiCheck />}
                cor="green"
                variacao={`${contasPagar.filter((c) => c.status === "pago").length} conta(s)`}
              />
            </div>

            {/* Barra de ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select value={filtroPagarStatus} onChange={(e) => setFiltroPagarStatus(e.target.value as typeof filtroPagarStatus)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="todos">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="pago">Pago</option>
                </select>
                <span className="text-xs text-gray-400 dark:text-gray-500">{contasPagarFiltradas.length} resultado(s)</span>
              </div>
              <button
                onClick={() => { setFormPagar(formPagarInicial); setErroPagar(null); setMostrarFormPagar(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <FiPlus size={16} /> Nova Conta a Pagar
              </button>
            </div>

            {/* Formulário nova conta a pagar */}
            {mostrarFormPagar && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Nova Conta a Pagar</h2>
                  <button onClick={() => setMostrarFormPagar(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FiX size={18} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FormInput label="Descrição" placeholder="Ex: Aluguel de maio" value={formPagar.descricao} onChange={(e) => setFormPagar((p) => ({ ...p, descricao: e.target.value }))} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fornecedor <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <select
                      value={formPagar.fornecedorId}
                      onChange={(e) => {
                        const c = clientes.find((x) => x.id === e.target.value);
                        setFormPagar((p) => ({ ...p, fornecedorId: e.target.value, fornecedor: c?.nome ?? "" }));
                      }}
                      className={selectClass}
                    >
                      <option value="">— Nenhum —</option>
                      {clientes.filter((c) => c.status === "ativo").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <FormInput label="Vencimento" type="date" value={formPagar.vencimento} onChange={(e) => setFormPagar((p) => ({ ...p, vencimento: e.target.value }))} required />
                  <FormInput label="Valor (R$)" type="number" placeholder="0.00" value={formPagar.valor} onChange={(e) => setFormPagar((p) => ({ ...p, valor: e.target.value }))} required />
                  <FormInput label="Categoria" placeholder="Ex: Aluguel, Fornecedores..." value={formPagar.categoria} onChange={(e) => setFormPagar((p) => ({ ...p, categoria: e.target.value }))} />
                </div>
                {erroPagar && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">{erroPagar}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSalvarPagar} disabled={salvandoPagar} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {salvandoPagar ? "Salvando..." : "Registrar"}
                  </button>
                  <button onClick={() => setMostrarFormPagar(false)} className="px-5 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabela contas a pagar */}
            {loadingPagar ? (
              <div className="text-sm text-gray-400 py-8 text-center">Carregando contas...</div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className={thClass}>Descrição</th>
                      <th className={thClass}>Fornecedor</th>
                      <th className={thClass}>Vencimento</th>
                      <th className={thClass}>Valor</th>
                      <th className={thClass}>Categoria</th>
                      <th className={thClass}>Status</th>
                      <th className={`${thClass} text-right`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {contasPagarFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Nenhuma conta encontrada.</td></tr>
                    ) : (
                      contasPagarFiltradas.map((conta) => {
                        const status = statusEfetivoPagar(conta);
                        return (
                          <tr key={conta.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className={tdClass}>{conta.descricao}</td>
                            <td className={tdClass}>{conta.fornecedor || "—"}</td>
                            <td className={`${tdClass} ${status === "atrasado" ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>{formatarData(conta.vencimento)}</td>
                            <td className={tdClass}>{formatarValor(Number(conta.valor))}</td>
                            <td className={tdClass}>{conta.categoria || "—"}</td>
                            <td className="px-4 py-3"><BadgePagar status={status} /></td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {status !== "pago" && (
                                  <button
                                    onClick={() => marcarPago(conta.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors"
                                    title="Marcar como pago"
                                  >
                                    <FiCheck size={13} /> Pago
                                  </button>
                                )}
                                <button onClick={() => handleDeletarPagar(conta)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Deletar">
                                  <FiTrash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════
            ABA: CONTAS A RECEBER
        ══════════════════════════════════════════════════════ */}
        {aba === "receber" && (
          <>
            {/* Stats contas a receber */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                titulo="Total em Aberto"
                valor={formatarValor(totalAReceber)}
                icone={<FiArrowUpCircle />}
                cor="green"
                variacao={`${contasReceber.filter((c) => statusEfetivoReceber(c) !== "recebido").length} conta(s)`}
              />
              <StatCard
                titulo="Em Atraso"
                valor={formatarValor(contasReceber.filter((c) => statusEfetivoReceber(c) === "atrasado").reduce((s, c) => s + Number(c.valor), 0))}
                icone={<FiTrendingDown />}
                cor="amber"
                variacao={`${contasReceber.filter((c) => statusEfetivoReceber(c) === "atrasado").length} conta(s)`}
              />
              <StatCard
                titulo="Recebidas"
                valor={formatarValor(contasReceber.filter((c) => c.status === "recebido").reduce((s, c) => s + Number(c.valor), 0))}
                icone={<FiCheck />}
                cor="blue"
                variacao={`${contasReceber.filter((c) => c.status === "recebido").length} conta(s)`}
              />
            </div>

            {/* Barra de ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select value={filtroReceberStatus} onChange={(e) => setFiltroReceberStatus(e.target.value as typeof filtroReceberStatus)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="todos">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="recebido">Recebido</option>
                </select>
                <span className="text-xs text-gray-400 dark:text-gray-500">{contasReceberFiltradas.length} resultado(s)</span>
              </div>
              <button
                onClick={() => { setFormReceber(formReceberInicial); setErroReceber(null); setMostrarFormReceber(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <FiPlus size={16} /> Nova Conta a Receber
              </button>
            </div>

            {/* Formulário nova conta a receber */}
            {mostrarFormReceber && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Nova Conta a Receber</h2>
                  <button onClick={() => setMostrarFormReceber(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FiX size={18} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <FormInput label="Descrição" placeholder="Ex: Parcela contrato João" value={formReceber.descricao} onChange={(e) => setFormReceber((p) => ({ ...p, descricao: e.target.value }))} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cliente <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <select
                      value={formReceber.clienteId}
                      onChange={(e) => {
                        const c = clientes.find((x) => x.id === e.target.value);
                        setFormReceber((p) => ({ ...p, clienteId: e.target.value, cliente: c?.nome ?? "" }));
                      }}
                      className={selectClass}
                    >
                      <option value="">— Nenhum —</option>
                      {clientes.filter((c) => c.status === "ativo").map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <FormInput label="Vencimento" type="date" value={formReceber.vencimento} onChange={(e) => setFormReceber((p) => ({ ...p, vencimento: e.target.value }))} required />
                  <FormInput label="Valor (R$)" type="number" placeholder="0.00" value={formReceber.valor} onChange={(e) => setFormReceber((p) => ({ ...p, valor: e.target.value }))} required />
                  <FormInput label="Categoria" placeholder="Ex: Mensalidade, Serviços..." value={formReceber.categoria} onChange={(e) => setFormReceber((p) => ({ ...p, categoria: e.target.value }))} />
                </div>
                {erroReceber && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">{erroReceber}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSalvarReceber} disabled={salvandoReceber} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {salvandoReceber ? "Salvando..." : "Registrar"}
                  </button>
                  <button onClick={() => setMostrarFormReceber(false)} className="px-5 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Tabela contas a receber */}
            {loadingReceber ? (
              <div className="text-sm text-gray-400 py-8 text-center">Carregando contas...</div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className={thClass}>Descrição</th>
                      <th className={thClass}>Cliente</th>
                      <th className={thClass}>Vencimento</th>
                      <th className={thClass}>Valor</th>
                      <th className={thClass}>Categoria</th>
                      <th className={thClass}>Status</th>
                      <th className={`${thClass} text-right`}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {contasReceberFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">Nenhuma conta encontrada.</td></tr>
                    ) : (
                      contasReceberFiltradas.map((conta) => {
                        const status = statusEfetivoReceber(conta);
                        return (
                          <tr key={conta.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className={tdClass}>{conta.descricao}</td>
                            <td className={tdClass}>{conta.cliente || "—"}</td>
                            <td className={`${tdClass} ${status === "atrasado" ? "text-red-600 dark:text-red-400 font-medium" : ""}`}>{formatarData(conta.vencimento)}</td>
                            <td className={tdClass}>{formatarValor(Number(conta.valor))}</td>
                            <td className={tdClass}>{conta.categoria || "—"}</td>
                            <td className="px-4 py-3"><BadgeReceber status={status} /></td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {status !== "recebido" && (
                                  <button
                                    onClick={() => marcarRecebido(conta.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                                    title="Marcar como recebido"
                                  >
                                    <FiCheck size={13} /> Recebido
                                  </button>
                                )}
                                <button onClick={() => handleDeletarReceber(conta)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Deletar">
                                  <FiTrash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}

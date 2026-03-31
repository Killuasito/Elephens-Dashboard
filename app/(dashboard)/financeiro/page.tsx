"use client";

import { useState, useMemo } from "react";
import {
  runTransaction,
  doc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/ui/DataTable";
import StatCard from "@/components/ui/StatCard";
import FormInput from "@/components/ui/FormInput";
import { useCollection, deleteDocument } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { Transacao, Produto, Cliente, Coluna } from "@/types";
import { FiPlus, FiX, FiTrendingUp, FiTrendingDown, FiDollarSign, FiLink, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";

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

const selectClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function FinanceiroPage() {
  const { user } = useAuth();
  const { dados: transacoes, loading } = useCollection<Transacao>("financeiro");
  const { dados: produtos } = useCollection<Produto>("produtos");
  const { dados: clientes } = useCollection<Cliente>("clientes");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // ─── Filtros ───────────────────────────────────────────────────
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "receita" | "despesa">("todos");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  const temFiltroAtivo =
    filtroTipo !== "todos" ||
    filtroCliente !== "" ||
    filtroCategoria !== "" ||
    filtroDataDe !== "" ||
    filtroDataAte !== "";

  function limparFiltros() {
    setFiltroTipo("todos");
    setFiltroCliente("");
    setFiltroCategoria("");
    setFiltroDataDe("");
    setFiltroDataAte("");
  }

  // Lista de categorias únicas para o select
  const categoriasUnicas = useMemo(() => {
    const s = new Set(transacoes.map((t) => t.categoria).filter(Boolean));
    return Array.from(s).sort();
  }, [transacoes]);

  // Lista de clientes únicos presentes nas transações
  const clientesNasTransacoes = useMemo(() => {
    const s = new Set(transacoes.map((t) => t.clienteNome).filter(Boolean));
    return Array.from(s).sort();
  }, [transacoes]);

  const totalReceitas = transacoes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const formatarValor = (v: number) =>
    `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  // Quando o usuário seleciona um produto: preenche valor, categoria e nome
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

  // Recalcula valor quando quantidade muda
  const handleQuantidade = (qtdStr: string) => {
    const qtd = parseInt(qtdStr) || 1;
    const produto = produtos.find((p) => p.id === form.produtoId);
    setForm((p) => ({
      ...p,
      quantidade: qtdStr,
      valor: produto ? (produto.preco * qtd).toFixed(2) : p.valor,
    }));
  };

  // Quando seleciona cliente
  const handleSelecionarCliente = (clienteId: string) => {
    const cliente = clientes.find((c) => c.id === clienteId);
    setForm((p) => ({
      ...p,
      clienteId: clienteId,
      clienteNome: cliente?.nome ?? "",
    }));
  };

  const handleSalvar = async () => {
    setErro(null);
    if (!form.descricao || !form.valor || !form.data) return;

    const valor = parseFloat(form.valor) || 0;
    const quantidade = parseInt(form.quantidade) || 1;
    const temProduto = !!form.produtoId && form.tipo === "receita";

    // Valida estoque disponível
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
      if (form.clienteId) {
        payload.clienteId = form.clienteId;
        payload.clienteNome = form.clienteNome;
      }
      if (temProduto) {
        payload.produtoId = form.produtoId;
        payload.produtoNome = form.produtoNome;
        payload.quantidade = quantidade;
      }

      if (temProduto) {
        // Operação atômica: registra lançamento + desconta estoque no mesmo commit
        await runTransaction(db, async (transaction) => {
          const produtoRef = doc(db, "produtos", form.produtoId);
          const produtoSnap = await transaction.get(produtoRef);

          if (!produtoSnap.exists()) throw new Error("Produto não encontrado.");

          const estoqueAtual = Number(produtoSnap.data().estoque ?? 0);
          if (estoqueAtual < quantidade) throw new Error(`Estoque insuficiente. Disponível: ${estoqueAtual}.`);

          const novoEstoque = estoqueAtual - quantidade;
          const novoStatus = novoEstoque === 0 ? "esgotado" : produtoSnap.data().status;

          transaction.update(produtoRef, {
            estoque: novoEstoque,
            status: novoStatus,
            atualizadoEm: serverTimestamp(),
          });

          const novoRef = doc(collection(db, "financeiro"));
          transaction.set(novoRef, payload);
        });
      } else {
        // Lançamento simples sem vínculo de produto
        const novoRef = doc(collection(db, "financeiro"));
        await runTransaction(db, async (transaction) => {
          transaction.set(novoRef, payload);
        });
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
      produtoNomeLabel: t.produtoNome ? `${t.produtoNome}${t.quantidade && t.quantidade > 1 ? ` ×${t.quantidade}` : ""}` : "—",
    }));

  const produtosAtivos = produtos.filter((p) => p.status === "ativo" && p.estoque > 0);

  return (
    <DashboardLayout titulo="Financeiro">
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard titulo="Total Receitas" valor={formatarValor(totalReceitas)} icone={<FiTrendingUp />} cor="green" variacao={`${transacoes.filter((t) => t.tipo === "receita").length} lançamento(s)`} />
          <StatCard titulo="Total Despesas" valor={formatarValor(totalDespesas)} icone={<FiTrendingDown />} cor="red" variacao={`${transacoes.filter((t) => t.tipo === "despesa").length} lançamento(s)`} />
          <StatCard titulo="Saldo" valor={formatarValor(saldo)} icone={<FiDollarSign />} cor={saldo >= 0 ? "blue" : "amber"} variacao={saldo >= 0 ? "Positivo" : "Negativo"} />
        </div>

        {/* Cabeçalho + barra de ações */}
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
              <button
                onClick={limparFiltros}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Limpar
              </button>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {dadosFiltrados.length} resultado(s)
            </span>
          </div>
          <button
            onClick={() => { setForm(formInicial); setErro(null); setMostrarForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FiPlus size={16} />
            Novo Lançamento
          </button>
        </div>

        {/* Painel de filtros expansível */}
        {mostrarFiltros && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Filtrar lançamentos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Tipo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)}
                  className={selectClass}
                >
                  <option value="todos">Todos</option>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>

              {/* Cliente */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Cliente / Fornecedor</label>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Todos</option>
                  {clientesNasTransacoes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Todas</option>
                  {categoriasUnicas.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Data de */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data — de</label>
                <input
                  type="date"
                  value={filtroDataDe}
                  onChange={(e) => setFiltroDataDe(e.target.value)}
                  className={selectClass}
                />
              </div>

              {/* Data até */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data — até</label>
                <input
                  type="date"
                  value={filtroDataAte}
                  onChange={(e) => setFiltroDataAte(e.target.value)}
                  className={selectClass}
                />
              </div>

            </div>
          </div>
        )}

        {/* Formulário */}
        {mostrarForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Novo Lançamento</h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><FiX size={18} /></button>
            </div>

            {/* Campos base */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormInput label="Descrição" placeholder="Ex: Venda de camiseta azul" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} required />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as Transacao["tipo"], produtoId: "", produtoNome: "", quantidade: "1" }))}
                  className={selectClass}
                >
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>

              <FormInput label="Data" type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))} required />
            </div>

            {/* Integrações */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                <FiLink size={13} />
                Vínculos opcionais
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cliente / Fornecedor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {form.tipo === "receita" ? "Cliente" : "Fornecedor"}
                    <span className="ml-1 text-xs text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={form.clienteId}
                    onChange={(e) => handleSelecionarCliente(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">— Nenhum —</option>
                    {clientes.filter((c) => c.status === "ativo").map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Produto — somente em receitas */}
                {form.tipo === "receita" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Produto
                      <span className="ml-1 text-xs text-gray-400 font-normal">(opcional — desconta estoque)</span>
                    </label>
                    <select
                      value={form.produtoId}
                      onChange={(e) => handleSelecionarProduto(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Nenhum —</option>
                      {produtosAtivos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {formatarValor(p.preco)} (estoque: {p.estoque})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantidade — aparece apenas quando produto selecionado */}
                {form.produtoId && form.tipo === "receita" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      max={produtos.find((p) => p.id === form.produtoId)?.estoque ?? 99}
                      value={form.quantidade}
                      onChange={(e) => handleQuantidade(e.target.value)}
                      className={selectClass}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Valor e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label={form.produtoId ? "Valor (calculado automaticamente)" : "Valor (R$)"}
                type="number"
                placeholder="0.00"
                value={form.valor}
                onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
                readOnly={!!form.produtoId}
                className={form.produtoId ? "opacity-70 cursor-not-allowed" : ""}
                required
              />
              <FormInput
                label="Categoria"
                placeholder="Ex: Vendas, Aluguel..."
                value={form.categoria}
                onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
              />
            </div>

            {/* Erro */}
            {erro && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">{erro}</p>
            )}

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

        {/* Tabela */}
        {loading ? (
          <div className="text-sm text-gray-400 py-8 text-center">Carregando lançamentos...</div>
        ) : (
          <DataTable colunas={colunas} dados={dadosFiltrados} onDeletar={handleDeletar} />
        )}
      </div>
    </DashboardLayout>
  );
}

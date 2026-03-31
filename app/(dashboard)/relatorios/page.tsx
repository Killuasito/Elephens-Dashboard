// Página de Relatórios — métricas consolidadas de todas as coleções

"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import GraficoFinanceiro from "@/components/ui/GraficoFinanceiro";
import GraficoCategorias from "@/components/ui/GraficoCategorias";
import GraficoTarefas from "@/components/ui/GraficoTarefas";
import { useCollection } from "@/hooks/useFirestore";
import { Cliente, Produto, Tarefa, Transacao, Coluna } from "@/types";
import { FiUsers, FiPackage, FiCheckSquare, FiTrendingUp, FiTrendingDown, FiDollarSign } from "react-icons/fi";

const colunasTransacoes: Coluna[] = [
  { chave: "data", label: "Data" },
  { chave: "descricao", label: "Descrição" },
  { chave: "categoria", label: "Categoria" },
  { chave: "tipoLabel", label: "Tipo" },
  { chave: "valorFormatado", label: "Valor" },
];

const formatarValor = (v: number) =>
  `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

export default function RelatoriosPage() {
  const { dados: clientes } = useCollection<Cliente>("clientes");
  const { dados: produtos } = useCollection<Produto>("produtos");
  const { dados: tarefas } = useCollection<Tarefa>("tarefas");
  const { dados: transacoes } = useCollection<Transacao>("financeiro");

  const totalReceitas = transacoes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const clientesAtivos = clientes.filter((c) => c.status === "ativo").length;
  const tarefasConcluidas = tarefas.filter((t) => t.status === "concluida").length;
  const produtosAtivos = produtos.filter((p) => p.status === "ativo").length;

  const ultimasTransacoes = [...transacoes]
    .sort((a, b) => (b.data > a.data ? 1 : -1))
    .slice(0, 10)
    .map((t) => ({
      ...t,
      tipoLabel: t.tipo === "receita" ? "Receita" : "Despesa",
      valorFormatado: formatarValor(Number(t.valor)),
    }));

  return (
    <DashboardLayout titulo="Relatórios">
      <div className="space-y-8">
        {/* Seção: Visão Geral */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Visão Geral</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard titulo="Clientes Ativos" valor={clientesAtivos} icone={<FiUsers />} cor="blue" variacao={`${clientes.length} total cadastrado(s)`} />
            <StatCard titulo="Produtos Ativos" valor={produtosAtivos} icone={<FiPackage />} cor="amber" variacao={`${produtos.length} total cadastrado(s)`} />
            <StatCard titulo="Tarefas Concluídas" valor={tarefasConcluidas} icone={<FiCheckSquare />} cor="green" variacao={`${tarefas.length} tarefa(s) no total`} />
          </div>
        </section>

        {/* Seção: Financeiro */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Financeiro</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard titulo="Total Receitas" valor={formatarValor(totalReceitas)} icone={<FiTrendingUp />} cor="green" variacao={`${transacoes.filter((t) => t.tipo === "receita").length} lançamento(s)`} />
            <StatCard titulo="Total Despesas" valor={formatarValor(totalDespesas)} icone={<FiTrendingDown />} cor="red" variacao={`${transacoes.filter((t) => t.tipo === "despesa").length} lançamento(s)`} />
            <StatCard titulo="Saldo" valor={formatarValor(saldo)} icone={<FiDollarSign />} cor={saldo >= 0 ? "blue" : "amber"} variacao={saldo >= 0 ? "Positivo" : "Negativo"} />
          </div>
        </section>

        {/* Seção: Gráficos */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gráficos</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <GraficoFinanceiro transacoes={transacoes} />
            <GraficoCategorias transacoes={transacoes} />
          </div>
          <GraficoTarefas tarefas={tarefas} />
        </section>

        {/* Seção: Últimas transações */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Últimos Lançamentos</h2>
          {ultimasTransacoes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Nenhum lançamento financeiro registrado ainda.</p>
          ) : (
            <DataTable colunas={colunasTransacoes} dados={ultimasTransacoes} />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
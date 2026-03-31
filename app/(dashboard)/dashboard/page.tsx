// Página principal do dashboard com métricas reais do Firestore

"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import { useCollection } from "@/hooks/useFirestore";
import { Cliente, Produto, Tarefa, Transacao, Coluna } from "@/types";
import { FiUsers, FiDollarSign, FiCheckSquare, FiPackage } from "react-icons/fi";

const colunasClientes: Coluna[] = [
  { chave: "nome", label: "Nome" },
  { chave: "email", label: "E-mail" },
  { chave: "status", label: "Status" },
];

export default function DashboardPage() {
  const { dados: clientes } = useCollection<Cliente>("clientes");
  const { dados: produtos } = useCollection<Produto>("produtos");
  const { dados: tarefas } = useCollection<Tarefa>("tarefas");
  const { dados: transacoes } = useCollection<Transacao>("financeiro");

  const clientesAtivos = clientes.filter((c) => c.status === "ativo").length;
  const tarefasPendentes = tarefas.filter((t) => t.status !== "concluida").length;
  const totalReceitas = transacoes.filter((t) => t.tipo === "receita").reduce((acc, t) => acc + Number(t.valor), 0);
  const totalDespesas = transacoes.filter((t) => t.tipo === "despesa").reduce((acc, t) => acc + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const formatarValor = (v: number) =>
    `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const metricas = [
    {
      titulo: "Clientes Ativos",
      valor: clientesAtivos,
      icone: <FiUsers />,
      variacao: `${clientes.length} total`,
      cor: "blue" as const,
    },
    {
      titulo: "Saldo",
      valor: formatarValor(saldo),
      icone: <FiDollarSign />,
      variacao: `Receitas: ${formatarValor(totalReceitas)}`,
      cor: saldo >= 0 ? ("green" as const) : ("red" as const),
    },
    {
      titulo: "Tarefas Pendentes",
      valor: tarefasPendentes,
      icone: <FiCheckSquare />,
      variacao: `${tarefas.length} total`,
      cor: "amber" as const,
    },
    {
      titulo: "Produtos",
      valor: produtos.filter((p) => p.status === "ativo").length,
      icone: <FiPackage />,
      variacao: `${produtos.length} cadastrado(s)`,
      cor: "blue" as const,
    },
  ];

  const clientesRecentes = clientes.slice(0, 5);

  return (
    <DashboardLayout titulo="Dashboard">
      <div className="space-y-6">
        {/* Grid de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricas.map((metrica) => (
            <StatCard key={metrica.titulo} {...metrica} />
          ))}
        </div>

        {/* Clientes recentes */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
            Clientes Recentes
          </h2>
          {clientesRecentes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Nenhum cliente cadastrado ainda.</p>
          ) : (
            <DataTable colunas={colunasClientes} dados={clientesRecentes} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
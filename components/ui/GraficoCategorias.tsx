// Gráfico de pizza: Despesas por categoria
"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Transacao } from "@/types";

interface Props {
  transacoes: Transacao[];
}

const CORES = ["#3b82f6", "#ef4444", "#f59e0b", "#22c55e", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

export default function GraficoCategorias({ transacoes }: Props) {
  // Agrupa despesas por categoria
  const mapa = transacoes
    .filter((t) => t.tipo === "despesa")
    .reduce<Record<string, number>>((acc, t) => {
      const cat = t.categoria || "Geral";
      acc[cat] = (acc[cat] ?? 0) + Number(t.valor);
      return acc;
    }, {});

  const dados = Object.entries(mapa)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const formatarTooltip = (v: number) =>
    `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  if (dados.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center min-h-75">
        <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma despesa registrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Despesas por Categoria
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={dados}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {dados.map((_, index) => (
              <Cell key={index} fill={CORES[index % CORES.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatarTooltip(Number(value ?? 0)), "Total"]}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

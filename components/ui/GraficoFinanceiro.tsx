// Gráfico de barras: Receitas vs Despesas agrupadas por mês
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Transacao } from "@/types";

interface Props {
  transacoes: Transacao[];
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function GraficoFinanceiro({ transacoes }: Props) {
  // Agrupa receitas e despesas por mês do ano corrente
  const ano = new Date().getFullYear();

  const dados = MESES.map((mes, i) => {
    const mesStr = String(i + 1).padStart(2, "0");
    const prefixo = `${ano}-${mesStr}`;

    const receitas = transacoes
      .filter((t) => t.tipo === "receita" && t.data?.startsWith(prefixo))
      .reduce((acc, t) => acc + Number(t.valor), 0);

    const despesas = transacoes
      .filter((t) => t.tipo === "despesa" && t.data?.startsWith(prefixo))
      .reduce((acc, t) => acc + Number(t.valor), 0);

    return { mes, receitas, despesas };
  });

  const formatarEixo = (v: number) =>
    v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`;

  const formatarTooltip = (v: number) =>
    `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Receitas vs Despesas — {ano}
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatarEixo} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(value, name) => [formatarTooltip(Number(value ?? 0)), name === "receitas" ? "Receitas" : "Despesas"]}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Legend formatter={(v) => (v === "receitas" ? "Receitas" : "Despesas")} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="receitas" fill="#22c55e" radius={[6, 6, 0, 0]} />
          <Bar dataKey="despesas" fill="#ef4444" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

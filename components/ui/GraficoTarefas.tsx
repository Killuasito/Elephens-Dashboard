// Gráfico de barras horizontais: Status das tarefas
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Tarefa } from "@/types";

interface Props {
  tarefas: Tarefa[];
}

const CONFIG = [
  { status: "pendente", label: "Pendente", cor: "#f59e0b" },
  { status: "em_andamento", label: "Em Andamento", cor: "#3b82f6" },
  { status: "concluida", label: "Concluída", cor: "#22c55e" },
];

export default function GraficoTarefas({ tarefas }: Props) {
  const dados = CONFIG.map(({ status, label, cor }) => ({
    label,
    total: tarefas.filter((t) => t.status === status).length,
    cor,
  }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Tarefas por Status
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} layout="vertical" barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            formatter={(v) => [Number(v ?? 0), "Tarefas"]}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: 13 }}
          />
          <Bar dataKey="total" radius={[0, 6, 6, 0]}>
            {dados.map((d, i) => (
              <Cell key={i} fill={d.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

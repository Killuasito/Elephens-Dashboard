// Componente de card de métrica reutilizável
// Exibe título, valor, ícone e variação percentual com cores configuráveis

"use client";

import { StatCardProps } from "@/types";
import clsx from "clsx";

// Mapeamento de cores para as classes do Tailwind
const coresMap = {
  blue: {
    fundo: "bg-blue-50 dark:bg-blue-900/20",
    icone: "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300",
    valor: "text-blue-700 dark:text-blue-300",
  },
  green: {
    fundo: "bg-green-50 dark:bg-green-900/20",
    icone: "bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-300",
    valor: "text-green-700 dark:text-green-300",
  },
  amber: {
    fundo: "bg-amber-50 dark:bg-amber-900/20",
    icone: "bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-300",
    valor: "text-amber-700 dark:text-amber-300",
  },
  red: {
    fundo: "bg-red-50 dark:bg-red-900/20",
    icone: "bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300",
    valor: "text-red-700 dark:text-red-300",
  },
};

export default function StatCard({
  titulo,
  valor,
  icone,
  variacao,
  cor = "blue",
}: StatCardProps) {
  const cores = coresMap[cor];

  return (
    <div
      className={clsx(
        "rounded-xl shadow-sm p-5 flex flex-col gap-3 transition-all hover:shadow-md",
        cores.fundo
      )}
    >
      {/* Ícone do card */}
      <div className={clsx("p-2.5 rounded-xl text-2xl w-fit", cores.icone)}>
        {icone}
      </div>

      {/* Informações do card */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
          {titulo}
        </span>
        <span className={clsx("text-xl sm:text-2xl font-bold", cores.valor)}>
          {valor}
        </span>
        {variacao && (
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
            {variacao}
          </span>
        )}
      </div>
    </div>
  );
}
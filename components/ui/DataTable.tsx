// Tabela genérica e reutilizável para exibir qualquer coleção de dados
// Suporta ações de editar e deletar por linha

"use client";

import { DataTableProps } from "@/types";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

export default function DataTable<T extends Record<string, unknown>>({
  colunas,
  dados,
  onEditar,
  onDeletar,
}: DataTableProps<T>) {
  const temAcoes = onEditar || onDeletar;

  return (
    <div className="w-full overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm text-left">
        {/* Cabeçalho */}
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {colunas.map((col) => (
              <th
                key={col.chave}
                className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs"
              >
                {col.label}
              </th>
            ))}
            {temAcoes && (
              <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs text-right">
                Ações
              </th>
            )}
          </tr>
        </thead>

        {/* Corpo da tabela */}
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {dados.length === 0 ? (
            <tr>
              <td
                colSpan={colunas.length + (temAcoes ? 1 : 0)}
                className="px-4 py-8 text-center text-gray-400 dark:text-gray-500"
              >
                Nenhum registro encontrado.
              </td>
            </tr>
          ) : (
            dados.map((linha, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {colunas.map((col) => (
                  <td
                    key={col.chave}
                    className="px-4 py-3 text-gray-700 dark:text-gray-300"
                  >
                    {String(linha[col.chave] ?? "-")}
                  </td>
                ))}
                {temAcoes && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onEditar && (
                        <button
                          onClick={() => onEditar(linha)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          title="Editar"
                        >
                          <FiEdit2 size={15} />
                        </button>
                      )}
                      {onDeletar && (
                        <button
                          onClick={() => onDeletar(linha)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Deletar"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  useCollection,
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/hooks/useFirestore";
import { Tarefa } from "@/types";
import { FiPlus, FiX, FiTrash2, FiEdit2, FiCheckSquare } from "react-icons/fi";
import clsx from "clsx";

const colunas: { status: Tarefa["status"]; label: string; cor: string }[] = [
  { status: "pendente", label: "Pendente", cor: "border-t-amber-400" },
  { status: "em_andamento", label: "Em Andamento", cor: "border-t-blue-500" },
  { status: "concluida", label: "Concluída", cor: "border-t-green-500" },
];

const prioridadeCor: Record<Tarefa["prioridade"], string> = {
  baixa: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  alta: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
};

const formInicial = { titulo: "", descricao: "", prioridade: "media" as Tarefa["prioridade"], status: "pendente" as Tarefa["status"] };

export default function TarefasPage() {
  const { dados: tarefas, loading } = useCollection<Tarefa>("tarefas");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!form.titulo) return;
    setSalvando(true);

    if (editandoId) {
      await updateDocument("tarefas", editandoId, form);
    } else {
      await addDocument("tarefas", form);
    }

    setForm(formInicial);
    setEditandoId(null);
    setMostrarForm(false);
    setSalvando(false);
  };

  const handleEditar = (tarefa: Tarefa) => {
    setForm({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao ?? "",
      prioridade: tarefa.prioridade,
      status: tarefa.status,
    });
    setEditandoId(tarefa.id);
    setMostrarForm(true);
  };

  const handleMoverStatus = async (tarefa: Tarefa, novoStatus: Tarefa["status"]) => {
    await updateDocument("tarefas", tarefa.id, { status: novoStatus });
  };

  const handleDeletar = async (tarefa: Tarefa) => {
    if (confirm(`Deseja remover a tarefa "${tarefa.titulo}"?`)) {
      await deleteDocument("tarefas", tarefa.id);
    }
  };

  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;

  return (
    <DashboardLayout titulo="Tarefas">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {concluidas}/{total} concluída{total !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => { setForm(formInicial); setEditandoId(null); setMostrarForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FiPlus size={16} />
            Nova Tarefa
          </button>
        </div>

        {/* Formulário */}
        {mostrarForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                {editandoId ? "Editar Tarefa" : "Nova Tarefa"}
              </h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Título <span className="text-red-400">*</span></label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  placeholder="Ex: Revisar contrato do cliente"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Detalhes opcionais..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
                <select
                  value={form.prioridade}
                  onChange={(e) => setForm((p) => ({ ...p, prioridade: e.target.value as Tarefa["prioridade"] }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Tarefa["status"] }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSalvar} disabled={salvando} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {salvando ? "Salvando..." : editandoId ? "Atualizar" : "Criar Tarefa"}
              </button>
              <button onClick={() => setMostrarForm(false)} className="px-5 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Kanban */}
        {loading ? (
          <div className="text-sm text-gray-400 py-8 text-center">Carregando tarefas...</div>
        ) : total === 0 && !mostrarForm ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3">
            <FiCheckSquare size={48} className="text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma tarefa criada</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Clique em &ldquo;Nova Tarefa&rdquo; para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {colunas.map((col) => {
              const itens = tarefas.filter((t) => t.status === col.status);
              return (
                <div key={col.status} className={clsx("bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 border-t-4", col.cor)}>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{itens.length}</span>
                  </div>

                  <div className="p-3 space-y-3 min-h-30">
                    {itens.map((tarefa) => (
                      <div key={tarefa.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2 group">
                        <div className="flex items-start justify-between gap-2">
                          <p className={clsx("text-sm font-medium text-gray-800 dark:text-gray-100", tarefa.status === "concluida" && "line-through text-gray-400 dark:text-gray-500")}>
                            {tarefa.titulo}
                          </p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditar(tarefa)} className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                              <FiEdit2 size={13} />
                            </button>
                            <button onClick={() => handleDeletar(tarefa)} className="p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {tarefa.descricao && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{tarefa.descricao}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium capitalize", prioridadeCor[tarefa.prioridade])}>
                            {tarefa.prioridade}
                          </span>

                          {/* Botões de mover status */}
                          <div className="flex gap-1">
                            {col.status !== "pendente" && (
                              <button
                                onClick={() => handleMoverStatus(tarefa, col.status === "em_andamento" ? "pendente" : "em_andamento")}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              >
                                ← Voltar
                              </button>
                            )}
                            {col.status !== "concluida" && (
                              <button
                                onClick={() => handleMoverStatus(tarefa, col.status === "pendente" ? "em_andamento" : "concluida")}
                                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                              >
                                Avançar →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {itens.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-4">Nenhuma tarefa aqui</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

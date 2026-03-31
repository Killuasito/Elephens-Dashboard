// Página de Clientes — CRUD completo conectado ao Firestore
// Usa useCollection, addDocument, updateDocument, deleteDocument

"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/ui/DataTable";
import FormInput from "@/components/ui/FormInput";
import {
  useCollection,
  addDocument,
  updateDocument,
  deleteDocument,
} from "@/hooks/useFirestore";
import { Cliente, Coluna } from "@/types";
import { FiPlus, FiX } from "react-icons/fi";

// Colunas da tabela de clientes
const colunas: Coluna[] = [
  { chave: "nome", label: "Nome" },
  { chave: "email", label: "E-mail" },
  { chave: "telefone", label: "Telefone" },
  { chave: "status", label: "Status" },
];

// Estado inicial do formulário
const formInicial = { nome: "", email: "", telefone: "", status: "ativo" };

export default function ClientesPage() {
  // Escuta a coleção "clientes" em tempo real
  const { dados: clientes, loading } = useCollection<Cliente>("clientes");

  // Controle do formulário inline
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Máscara de telefone: (99) 99999-9999
  const mascaraTelefone = (valor: string) => {
    const digits = valor.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Atualiza campo do formulário
  const handleChange = (campo: string, valor: string) => {
    const formatado = campo === "telefone" ? mascaraTelefone(valor) : valor;
    setForm((prev) => ({ ...prev, [campo]: formatado }));
  };

  // Salva (cria ou atualiza) um cliente
  const handleSalvar = async () => {
    if (!form.nome || !form.email) return;
    setSalvando(true);

    if (editandoId) {
      await updateDocument("clientes", editandoId, form);
    } else {
      await addDocument("clientes", { ...form, status: "ativo" });
    }

    setForm(formInicial);
    setEditandoId(null);
    setMostrarForm(false);
    setSalvando(false);
  };

  // Abre formulário com dados do cliente para edição
  const handleEditar = (item: Record<string, unknown>) => {
    setForm({
      nome: String(item.nome ?? ""),
      email: String(item.email ?? ""),
      telefone: String(item.telefone ?? ""),
      status: String(item.status ?? "ativo"),
    });
    setEditandoId(String(item.id));
    setMostrarForm(true);
  };

  // Remove cliente após confirmação
  const handleDeletar = async (item: Record<string, unknown>) => {
    if (confirm(`Deseja remover o cliente "${item.nome}"?`)) {
      await deleteDocument("clientes", String(item.id));
    }
  };

  return (
    <DashboardLayout titulo="Clientes">
      <div className="space-y-6">
        {/* Cabeçalho com botão novo cliente */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
            Gerenciar Clientes
          </h2>
          <button
            onClick={() => {
              setForm(formInicial);
              setEditandoId(null);
              setMostrarForm(!mostrarForm);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {mostrarForm ? <FiX size={16} /> : <FiPlus size={16} />}
            {mostrarForm ? "Cancelar" : "Novo Cliente"}
          </button>
        </div>

        {/* Formulário inline de criação/edição */}
        {mostrarForm && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {editandoId ? "Editar Cliente" : "Novo Cliente"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Nome completo"
                placeholder="João Silva"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
              />
              <FormInput
                label="E-mail"
                type="email"
                placeholder="joao@email.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <FormInput
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={form.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {/* Tabela de clientes */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Carregando clientes...
          </div>
        ) : (
          <DataTable
            colunas={colunas}
            dados={clientes as unknown as Record<string, unknown>[]}
            onEditar={handleEditar}
            onDeletar={handleDeletar}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
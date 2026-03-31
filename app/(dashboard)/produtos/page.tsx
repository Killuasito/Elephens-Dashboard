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
import { Produto, Coluna } from "@/types";
import { FiPlus, FiX, FiPackage } from "react-icons/fi";

const colunas: Coluna[] = [
  { chave: "nome", label: "Nome" },
  { chave: "categoria", label: "Categoria" },
  { chave: "precoFormatado", label: "Preço" },
  { chave: "estoque", label: "Estoque" },
  { chave: "status", label: "Status" },
];

const formInicial = {
  nome: "",
  categoria: "",
  preco: "",
  estoque: "",
  status: "ativo",
};

export default function ProdutosPage() {
  const { dados: produtos, loading } = useCollection<Produto>("produtos");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const handleChange = (campo: string, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSalvar = async () => {
    if (!form.nome || !form.categoria || !form.preco) return;
    setSalvando(true);

    const payload = {
      nome: form.nome,
      categoria: form.categoria,
      preco: parseFloat(form.preco) || 0,
      estoque: parseInt(form.estoque) || 0,
      status: form.status as Produto["status"],
    };

    if (editandoId) {
      await updateDocument("produtos", editandoId, payload);
    } else {
      await addDocument("produtos", payload);
    }

    setForm(formInicial);
    setEditandoId(null);
    setMostrarForm(false);
    setSalvando(false);
  };

  const handleEditar = (item: Record<string, unknown>) => {
    setForm({
      nome: String(item.nome ?? ""),
      categoria: String(item.categoria ?? ""),
      preco: String(item.preco ?? ""),
      estoque: String(item.estoque ?? ""),
      status: String(item.status ?? "ativo"),
    });
    setEditandoId(String(item.id));
    setMostrarForm(true);
  };

  const handleDeletar = async (item: Record<string, unknown>) => {
    if (confirm(`Deseja remover o produto "${item.nome}"?`)) {
      await deleteDocument("produtos", String(item.id));
    }
  };

  // Formata o preço para exibição na tabela
  const dadosFormatados = produtos.map((p) => ({
    ...p,
    precoFormatado: `R$ ${Number(p.preco).toFixed(2).replace(".", ",")}`,
  }));

  return (
    <DashboardLayout titulo="Produtos">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {produtos.length} produto{produtos.length !== 1 ? "s" : ""} cadastrado{produtos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => {
              setForm(formInicial);
              setEditandoId(null);
              setMostrarForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <FiPlus size={16} />
            Novo Produto
          </button>
        </div>

        {/* Formulário inline */}
        {mostrarForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                {editandoId ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput label="Nome" placeholder="Ex: Camiseta Azul" value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
              <FormInput label="Categoria" placeholder="Ex: Vestuário" value={form.categoria} onChange={(e) => handleChange("categoria", e.target.value)} required />
              <FormInput label="Preço (R$)" type="number" placeholder="0.00" value={form.preco} onChange={(e) => handleChange("preco", e.target.value)} required />
              <FormInput label="Estoque" type="number" placeholder="0" value={form.estoque} onChange={(e) => handleChange("estoque", e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="esgotado">Esgotado</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {salvando ? "Salvando..." : editandoId ? "Atualizar" : "Cadastrar"}
              </button>
              <button onClick={() => setMostrarForm(false)} className="px-5 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">Carregando produtos...</div>
        ) : produtos.length === 0 && !mostrarForm ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-3">
            <FiPackage size={48} className="text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum produto cadastrado</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Clique em &ldquo;Novo Produto&rdquo; para começar.</p>
          </div>
        ) : (
          <DataTable colunas={colunas} dados={dadosFormatados} onEditar={handleEditar} onDeletar={handleDeletar} />
        )}
      </div>
    </DashboardLayout>
  );
}

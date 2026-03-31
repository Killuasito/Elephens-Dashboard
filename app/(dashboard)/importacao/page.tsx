"use client";

import { useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  FiUpload,
  FiCheckCircle,
  FiAlertCircle,
  FiFileText,
  FiX,
  FiDownload,
  FiUsers,
  FiPackage,
  FiCheckSquare,
  FiTrendingUp,
} from "react-icons/fi";
import clsx from "clsx";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

// ─── Tipos esperados no JSON de importação ───────────────────────

interface ClienteImport {
  nome: string;
  email?: string;
  telefone?: string;
  status?: string;
  documento?: string;
}

interface ProdutoImport {
  nome: string;
  categoria?: string;
  preco?: number | string;
  estoque?: number | string;
  status?: string;
}

interface TarefaImport {
  titulo: string;
  descricao?: string;
  prioridade?: string;
  status?: string;
}

interface TransacaoImport {
  descricao: string;
  tipo?: string;
  valor?: number | string;
  categoria?: string;
  data?: string;
}

interface JsonImport {
  clientes?: ClienteImport[];
  produtos?: ProdutoImport[];
  tarefas?: TarefaImport[];
  financeiro?: TransacaoImport[];
}

// ─── Resultado por coleção ───────────────────────────────────────

interface ResultadoColecao {
  colecao: string;
  label: string;
  icone: React.ReactNode;
  total: number;
  importados: number;
  erros: string[];
}

// ─── Template de exemplo para download ───────────────────────────

const TEMPLATE: JsonImport = {
  clientes: [
    { nome: "João Silva", email: "joao@email.com", telefone: "(11) 99999-0001", status: "ativo", documento: "123.456.789-00" },
    { nome: "Maria Souza", email: "maria@email.com", telefone: "(21) 98888-0002", status: "ativo" },
  ],
  produtos: [
    { nome: "Camiseta Polo", categoria: "Vestuário", preco: 89.90, estoque: 50, status: "ativo" },
    { nome: "Caneca 300ml", categoria: "Utilidades", preco: 29.90, estoque: 100, status: "ativo" },
  ],
  tarefas: [
    { titulo: "Revisar estoque", descricao: "Conferir itens em falta", prioridade: "alta", status: "pendente" },
    { titulo: "Ligar para fornecedor", prioridade: "media", status: "em_andamento" },
  ],
  financeiro: [
    { descricao: "Venda de produtos", tipo: "receita", valor: 450.00, categoria: "Vendas", data: "2026-03-01" },
    { descricao: "Aluguel do escritório", tipo: "despesa", valor: 1200.00, categoria: "Infraestrutura", data: "2026-03-05" },
  ],
};

// ─── Helpers de normalização ─────────────────────────────────────

function normalizeStatus(v: string | undefined, opcoes: string[], padrao: string): string {
  if (!v) return padrao;
  const lower = v.toLowerCase().trim();
  return opcoes.includes(lower) ? lower : padrao;
}

function normalizeNum(v: number | string | undefined, padrao: number): number {
  const n = Number(v);
  return isNaN(n) ? padrao : n;
}

// ─── Funções de importação por coleção ───────────────────────────

async function importarClientes(dados: ClienteImport[], uid: string): Promise<{ importados: number; erros: string[] }> {
  let importados = 0;
  const erros: string[] = [];
  for (const item of dados) {
    if (!item.nome?.trim()) { erros.push(`Cliente sem nome ignorado`); continue; }
    try {
      await addDoc(collection(db, "clientes"), {
        nome: item.nome.trim(),
        email: item.email?.trim() ?? "",
        telefone: item.telefone?.trim() ?? "",
        status: normalizeStatus(item.status, ["ativo", "inativo"], "ativo"),
        documento: item.documento?.trim() ?? "",
        uid,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      importados++;
    } catch (e) {
      erros.push(`Erro ao importar "${item.nome}": ${e}`);
    }
  }
  return { importados, erros };
}

async function importarProdutos(dados: ProdutoImport[], uid: string): Promise<{ importados: number; erros: string[] }> {
  let importados = 0;
  const erros: string[] = [];
  for (const item of dados) {
    if (!item.nome?.trim()) { erros.push(`Produto sem nome ignorado`); continue; }
    try {
      await addDoc(collection(db, "produtos"), {
        nome: item.nome.trim(),
        categoria: item.categoria?.trim() ?? "Geral",
        preco: normalizeNum(item.preco, 0),
        estoque: normalizeNum(item.estoque, 0),
        status: normalizeStatus(item.status, ["ativo", "inativo", "esgotado"], "ativo"),
        uid,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      importados++;
    } catch (e) {
      erros.push(`Erro ao importar "${item.nome}": ${e}`);
    }
  }
  return { importados, erros };
}

async function importarTarefas(dados: TarefaImport[], uid: string): Promise<{ importados: number; erros: string[] }> {
  let importados = 0;
  const erros: string[] = [];
  for (const item of dados) {
    if (!item.titulo?.trim()) { erros.push(`Tarefa sem título ignorada`); continue; }
    try {
      await addDoc(collection(db, "tarefas"), {
        titulo: item.titulo.trim(),
        descricao: item.descricao?.trim() ?? "",
        prioridade: normalizeStatus(item.prioridade, ["baixa", "media", "alta"], "media"),
        status: normalizeStatus(item.status, ["pendente", "em_andamento", "concluida"], "pendente"),
        uid,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      importados++;
    } catch (e) {
      erros.push(`Erro ao importar "${item.titulo}": ${e}`);
    }
  }
  return { importados, erros };
}

async function importarFinanceiro(dados: TransacaoImport[], uid: string): Promise<{ importados: number; erros: string[] }> {
  let importados = 0;
  const erros: string[] = [];
  for (const item of dados) {
    if (!item.descricao?.trim()) { erros.push(`Transação sem descrição ignorada`); continue; }
    try {
      await addDoc(collection(db, "financeiro"), {
        descricao: item.descricao.trim(),
        tipo: normalizeStatus(item.tipo, ["receita", "despesa"], "despesa"),
        valor: normalizeNum(item.valor, 0),
        categoria: item.categoria?.trim() ?? "Outros",
        data: item.data ?? new Date().toISOString().split("T")[0],
        uid,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      importados++;
    } catch (e) {
      erros.push(`Erro ao importar "${item.descricao}": ${e}`);
    }
  }
  return { importados, erros };
}

// ─── Componente principal ─────────────────────────────────────────

export default function ImportacaoPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<JsonImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoColecao[] | null>(null);
  const [drag, setDrag] = useState(false);

  function handleArquivo(file: File) {
    setArquivo(file);
    setPreview(null);
    setParseError(null);
    setResultados(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as JsonImport;
        setPreview(json);
      } catch {
        setParseError("Arquivo JSON inválido. Verifique a formatação.");
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/json" || file?.name.endsWith(".json")) {
      handleArquivo(file);
    } else {
      setParseError("Apenas arquivos .json são aceitos.");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleArquivo(file);
  }

  function baixarTemplate() {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-importacao-elephens.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function limpar() {
    setArquivo(null);
    setPreview(null);
    setParseError(null);
    setResultados(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function executarImportacao() {
    if (!preview) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setImportando(true);

    const res: ResultadoColecao[] = [];

    if (preview.clientes?.length) {
      const r = await importarClientes(preview.clientes, uid);
      res.push({ colecao: "clientes", label: "Clientes", icone: <FiUsers size={16} />, total: preview.clientes.length, ...r });
    }
    if (preview.produtos?.length) {
      const r = await importarProdutos(preview.produtos, uid);
      res.push({ colecao: "produtos", label: "Produtos", icone: <FiPackage size={16} />, total: preview.produtos.length, ...r });
    }
    if (preview.tarefas?.length) {
      const r = await importarTarefas(preview.tarefas, uid);
      res.push({ colecao: "tarefas", label: "Tarefas", icone: <FiCheckSquare size={16} />, total: preview.tarefas.length, ...r });
    }
    if (preview.financeiro?.length) {
      const r = await importarFinanceiro(preview.financeiro, uid);
      res.push({ colecao: "financeiro", label: "Financeiro", icone: <FiTrendingUp size={16} />, total: preview.financeiro.length, ...r });
    }

    setResultados(res);
    setImportando(false);
  }

  const totalRegistros = preview
    ? (preview.clientes?.length ?? 0) +
      (preview.produtos?.length ?? 0) +
      (preview.tarefas?.length ?? 0) +
      (preview.financeiro?.length ?? 0)
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Importação via JSON</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Importe clientes, produtos, tarefas e lançamentos financeiros de outro sistema.
            </p>
          </div>
          <button
            onClick={baixarTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <FiDownload size={15} />
            Baixar template
          </button>
        </div>

        {/* Área de upload */}
        {!arquivo && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={clsx(
              "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors",
              drag
                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
                : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500">
              <FiUpload size={28} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Arraste seu arquivo JSON aqui
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                ou clique para selecionar
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Erro de parse */}
        {parseError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
          </div>
        )}

        {/* Preview do arquivo */}
        {arquivo && preview && !resultados && (
          <div className="space-y-4">
            {/* Barra do arquivo */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                  <FiFileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{arquivo.name}</p>
                  <p className="text-xs text-gray-400">{totalRegistros} registro(s) encontrado(s)</p>
                </div>
              </div>
              <button onClick={limpar} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <FiX size={16} />
              </button>
            </div>

            {/* Cards de preview por coleção */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { chave: "clientes" as const, label: "Clientes", icone: <FiUsers size={16} />, cor: "blue" },
                { chave: "produtos" as const, label: "Produtos", icone: <FiPackage size={16} />, cor: "green" },
                { chave: "tarefas" as const, label: "Tarefas", icone: <FiCheckSquare size={16} />, cor: "amber" },
                { chave: "financeiro" as const, label: "Financeiro", icone: <FiTrendingUp size={16} />, cor: "purple" },
              ].map(({ chave, label, icone, cor }) => {
                const qtd = preview[chave]?.length ?? 0;
                return (
                  <div
                    key={chave}
                    className={clsx(
                      "p-4 rounded-xl border flex items-center gap-3",
                      qtd > 0
                        ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                        : "bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800 opacity-50"
                    )}
                  >
                    <div className={clsx(
                      "p-2 rounded-lg",
                      cor === "blue"   && "bg-blue-50 dark:bg-blue-900/20 text-blue-500",
                      cor === "green"  && "bg-green-50 dark:bg-green-900/20 text-green-500",
                      cor === "amber"  && "bg-amber-50 dark:bg-amber-900/20 text-amber-500",
                      cor === "purple" && "bg-purple-50 dark:bg-purple-900/20 text-purple-500",
                    )}>
                      {icone}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{qtd}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botão de importar */}
            <button
              onClick={executarImportacao}
              disabled={importando || totalRegistros === 0}
              className={clsx(
                "w-full py-3 rounded-xl font-medium text-sm transition-colors",
                importando || totalRegistros === 0
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {importando ? "Importando..." : `Importar ${totalRegistros} registro(s)`}
            </button>
          </div>
        )}

        {/* Resultado da importação */}
        {resultados && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <FiCheckCircle size={20} />
              <h3 className="font-semibold text-base">Importação concluída</h3>
            </div>

            {resultados.map((r) => (
              <div key={r.colecao} className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {r.icone}
                    {r.label}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {r.importados}/{r.total} importado(s)
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      r.erros.length > 0 ? "bg-amber-500" : "bg-green-500"
                    )}
                    style={{ width: `${r.total > 0 ? (r.importados / r.total) * 100 : 0}%` }}
                  />
                </div>

                {r.erros.length > 0 && (
                  <ul className="text-xs text-red-500 dark:text-red-400 space-y-0.5 mt-1">
                    {r.erros.map((e, i) => <li key={i}>⚠ {e}</li>)}
                  </ul>
                )}
              </div>
            ))}

            <button
              onClick={limpar}
              className="w-full py-3 rounded-xl font-medium text-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Importar outro arquivo
            </button>
          </div>
        )}

        {/* Instruções do formato */}
        <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 space-y-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Formato esperado do JSON</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            O arquivo deve conter um objeto com uma ou mais das chaves abaixo. Todos os campos são opcionais, exceto o nome/título de cada registro.
          </p>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300 leading-relaxed">
{`{
  "clientes":  [{ "nome", "email", "telefone", "status", "documento" }],
  "produtos":  [{ "nome", "categoria", "preco", "estoque", "status" }],
  "tarefas":   [{ "titulo", "descricao", "prioridade", "status" }],
  "financeiro":[{ "descricao", "tipo", "valor", "categoria", "data" }]
}`}
          </pre>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Baixe o template acima para ver um exemplo completo pronto para preencher.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

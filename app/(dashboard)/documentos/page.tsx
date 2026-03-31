"use client";

import { useState, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Arquivo } from "@/types";
import {
  FiUploadCloud,
  FiFile,
  FiTrash2,
  FiExternalLink,
  FiX,
  FiSearch,
} from "react-icons/fi";
import clsx from "clsx";

// ─── Helpers ─────────────────────────────────────────────────────
function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatarData(val: unknown): string {
  if (!val) return "—";
  // Firestore Timestamp ou Date
  const date =
    typeof (val as { toDate?: () => Date }).toDate === "function"
      ? (val as { toDate: () => Date }).toDate()
      : new Date(val as string);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Cartão de documento ─────────────────────────────────────────
function CartaoDocumento({
  arquivo,
  onDeletar,
}: {
  arquivo: Arquivo;
  onDeletar: (arquivo: Arquivo) => void;
}) {
  return (
    <div className="group flex items-start gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all">
      {/* Ícone PDF */}
      <div className="shrink-0 w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400">
        <FiFile size={22} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {arquivo.nome}
        </p>
        {arquivo.descricao && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {arquivo.descricao}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
          {formatarTamanho(arquivo.tamanhoBytes)} · {formatarData(arquivo.criadoEm)}
        </p>
      </div>

      {/* Ações */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={arquivo.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir PDF"
          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <FiExternalLink size={16} />
        </a>
        <button
          onClick={() => onDeletar(arquivo)}
          title="Remover"
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export default function DocumentosPage() {
  const { user } = useAuth();
  const { dados: arquivos, loading } = useCollection<Arquivo>("documentos");

  // Upload state
  const [descricao, setDescricao] = useState("");
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Search
  const [busca, setBusca] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Drag & Drop ──
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      setArquivoSelecionado(file);
      setErro(null);
    } else {
      setErro("Apenas arquivos PDF são aceitos.");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setErro("Apenas arquivos PDF são aceitos.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErro("O arquivo excede o limite de 20 MB.");
      return;
    }
    setArquivoSelecionado(file);
    setErro(null);
  };

  // ── Upload via XHR para ter barra de progresso ──
  const handleUpload = () => {
    if (!arquivoSelecionado || !user) return;
    setErro(null);
    setEnviando(true);
    setProgresso(0);

    const formData = new FormData();
    formData.append("file", arquivoSelecionado);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgresso(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status !== 200) {
          setErro(res.erro || "Erro no upload.");
          return;
        }
        await addDoc(collection(db, "documentos"), {
          nome: arquivoSelecionado.name,
          descricao: descricao.trim(),
          url: res.url,
          storagePath: res.filename, // guarda apenas o nome do arquivo
          tamanhoBytes: arquivoSelecionado.size,
          uid: user!.uid,
          criadoEm: serverTimestamp(),
        });
        setArquivoSelecionado(null);
        setDescricao("");
        setProgresso(null);
        if (inputRef.current) inputRef.current.value = "";
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao salvar.");
      } finally {
        setEnviando(false);
      }
    };

    xhr.onerror = () => {
      setErro("Erro de rede. Verifique a conexão.");
      setEnviando(false);
      setProgresso(null);
    };

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  // ── Deletar ──
  const handleDeletar = async (arquivo: Arquivo) => {
    if (!confirm(`Remover "${arquivo.nome}"? Esta ação não pode ser desfeita.`)) return;
    // Remove arquivo do disco via API
    await fetch(`/api/upload?filename=${encodeURIComponent(arquivo.storagePath)}`, {
      method: "DELETE",
    });
    // Remove metadados do Firestore
    await deleteDoc(doc(db, "documentos", arquivo.id));
  };

  // ── Filtro de busca ──
  const arquivosFiltrados = arquivos.filter(
    (a) =>
      busca === "" ||
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <DashboardLayout titulo="Documentos">
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Upload card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Enviar novo documento
          </h2>

          {/* Dropzone */}
          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !arquivoSelecionado && inputRef.current?.click()}
            className={clsx(
              "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer select-none",
              arquivoSelecionado
                ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {arquivoSelecionado ? (
              <>
                <FiFile size={28} className="text-blue-500" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {arquivoSelecionado.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatarTamanho(arquivoSelecionado.size)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setArquivoSelecionado(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiX size={16} />
                </button>
              </>
            ) : (
              <>
                <FiUploadCloud size={28} className="text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Clique ou arraste um PDF aqui
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Máximo 20 MB</p>
                </div>
              </>
            )}
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição{" "}
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder='Ex: Contrato referente Teste, NF de julho...'
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Barra de progresso */}
          {progresso !== null && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-200"
                  style={{ width: `${progresso}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-right">{progresso}%</p>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-xl">
              {erro}
            </p>
          )}

          <button
            onClick={handleUpload}
            disabled={!arquivoSelecionado || enviando}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FiUploadCloud size={16} />
            {enviando ? "Enviando..." : "Enviar documento"}
          </button>
        </div>

        {/* Lista de documentos */}
        <div className="space-y-3">
          {/* Busca + count */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <FiSearch
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou descrição..."
                className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400 shrink-0">
              {arquivosFiltrados.length} documento{arquivosFiltrados.length !== 1 ? "s" : ""}
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Carregando documentos...</p>
          ) : arquivosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-600">
              <FiFile size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {busca ? "Nenhum documento encontrado." : "Nenhum documento enviado ainda."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {arquivosFiltrados.map((a) => (
                <CartaoDocumento key={a.id} arquivo={a} onDeletar={handleDeletar} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

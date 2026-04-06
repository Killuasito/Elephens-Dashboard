"use client";

import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useCollection } from "@/hooks/useFirestore";
import { usePermissoes } from "@/hooks/usePermissoes";
import { PLANOS } from "@/lib/planos";
import { Transacao, Cliente, Produto, Tarefa } from "@/types";
import { FiSend, FiMessageSquare, FiRefreshCw, FiBookmark, FiList, FiTrash2, FiX } from "react-icons/fi";
import { RiRobot2Line } from "react-icons/ri";
import clsx from "clsx";

// ─── Tipos internos ───────────────────────────────────────────────
interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

interface ChatSalvo {
  id: string;          // timestamp ISO como ID único
  titulo: string;      // primeira mensagem do usuário (truncada)
  mensagens: Mensagem[];
  salvadoEm: string;   // ISO string
}

const STORAGE_KEY = "elephens_chats_salvos";

// ─── Perguntas sugeridas ──────────────────────────────────────────
const SUGESTOES = [
  "Como está meu financeiro este mês?",
  "Quais produtos precisam de reposição?",
  "Me dê um resumo completo do negócio.",
  "Onde estou gastando mais?",
  "Quantas tarefas ainda estão pendentes?",
  "Qual cliente representa mais receita?",
];

// ─── Montagem do contexto para o modelo ──────────────────────────
function buildContexto(
  transacoes: Transacao[],
  clientes: Cliente[],
  produtos: Produto[],
  tarefas: Tarefa[]
): string {
  const fmt = (v: number) =>
    `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const receitas = transacoes.filter((t) => t.tipo === "receita");
  const despesas = transacoes.filter((t) => t.tipo === "despesa");
  const totalReceitas = receitas.reduce((a, t) => a + Number(t.valor), 0);
  const totalDespesas = despesas.reduce((a, t) => a + Number(t.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  // Últimas 8 transações ordenadas por data
  const recentes = [...transacoes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8)
    .map(
      (t) =>
        `  - ${t.data}: ${t.descricao} (${t.tipo === "receita" ? "Receita" : "Despesa"}) ${fmt(Number(t.valor))}${t.clienteNome ? ` — cliente: ${t.clienteNome}` : ""}${t.produtoNome ? ` — produto: ${t.produtoNome}` : ""}`
    )
    .join("\n");

  // Despesas por categoria
  const porCategoria = despesas.reduce(
    (acc, t) => {
      const cat = t.categoria || "Geral";
      acc[cat] = (acc[cat] || 0) + Number(t.valor);
      return acc;
    },
    {} as Record<string, number>
  );
  const categorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => `  - ${cat}: ${fmt(val)}`)
    .join("\n");

  // Produtos com estoque baixo / esgotados
  const esgotados = produtos.filter((p) => p.status === "esgotado");
  const estoqueBaixo = produtos.filter(
    (p) => p.status !== "esgotado" && p.estoque < 5
  );

  // Tarefas por status
  const pendentes = tarefas.filter((t) => t.status === "pendente").length;
  const emAndamento = tarefas.filter((t) => t.status === "em_andamento").length;
  const concluidas = tarefas.filter((t) => t.status === "concluida").length;

  return `## Financeiro
- Receitas totais: ${fmt(totalReceitas)} (${receitas.length} lançamentos)
- Despesas totais: ${fmt(totalDespesas)} (${despesas.length} lançamentos)
- Saldo: ${fmt(saldo)} (${saldo >= 0 ? "POSITIVO" : "NEGATIVO"})

## Últimas Transações
${recentes || "  Nenhuma transação registrada."}

## Despesas por Categoria
${categorias || "  Nenhuma despesa registrada."}

## Clientes
- Total de clientes ativos: ${clientes.filter((c) => c.status === "ativo").length}
- Total de clientes: ${clientes.length}

## Produtos
- Total de produtos: ${produtos.length}
- Esgotados: ${esgotados.length}${esgotados.length > 0 ? ` → ${esgotados.map((p) => p.nome).join(", ")}` : ""}
- Estoque baixo (< 5 un): ${estoqueBaixo.length}${estoqueBaixo.length > 0 ? `\n  ${estoqueBaixo.map((p) => `${p.nome}: ${p.estoque} un`).join("; ")}` : ""}

## Tarefas
- Pendentes: ${pendentes}
- Em andamento: ${emAndamento}
- Concluídas: ${concluidas}`;
}

// ─── Renderizador de Markdown leve (sem dependências externas) ───
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let tableBuffer: string[] = [];

  // Renderiza bold (**texto**) e preserva o resto como texto
  const renderInline = (s: string): React.ReactNode => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    if (parts.length === 1) return s;
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
  };

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    nodes.push(
      <ul key={key} className="list-none space-y-1 my-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-50 translate-y-1.25" />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushTable = (key: string) => {
    if (tableBuffer.length === 0) return;

    const parseRow = (line: string) =>
      line.split("|").slice(1, -1).map((c) => c.trim());

    const isSeparator = (line: string) => /^\|[\s\-:|]+\|$/.test(line.trim());

    const sepIdx = tableBuffer.findIndex(isSeparator);
    const headerRows = sepIdx > 0 ? tableBuffer.slice(0, sepIdx) : [];
    const bodyRows = sepIdx >= 0 ? tableBuffer.slice(sepIdx + 1) : tableBuffer;

    nodes.push(
      <div key={key} className="overflow-x-auto my-2 rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm border-collapse">
          {headerRows.length > 0 && (
            <thead className="bg-gray-100 dark:bg-gray-800">
              {headerRows.map((row, i) => (
                <tr key={i}>
                  {parseRow(row).map((cell, j) => (
                    <th
                      key={j}
                      className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap border-b border-gray-200 dark:border-gray-700"
                    >
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, i) => (
              <tr key={i} className={i % 2 !== 0 ? "bg-gray-50 dark:bg-gray-800/40" : ""}>
                {parseRow(row).map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                  >
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    tableBuffer = [];
  };

  lines.forEach((line, idx) => {
    const key = `l${idx}`;

    // Linha de tabela — começa com |
    if (line.trim().startsWith("|")) {
      flushList(`flush-${key}`);
      tableBuffer.push(line.trim());
      return;
    }

    // Headings ## e ###
    if (/^#{1,3} /.test(line)) {
      flushList(`flush-${key}`);
      flushTable(`table-${key}`);
      const level = (line.match(/^#+/) ?? [""])[0].length;
      const content = line.replace(/^#+\s*/, "");
      const className =
        level === 1
          ? "text-base font-bold mt-3 mb-1"
          : level === 2
          ? "text-sm font-bold mt-2 mb-0.5 opacity-80"
          : "text-sm font-semibold mt-1 opacity-70";
      nodes.push(
        <p key={key} className={className}>
          {renderInline(content)}
        </p>
      );
      return;
    }

    // Bullet: linhas que começam com - ou *
    if (/^[-*]\s+/.test(line)) {
      flushTable(`table-${key}`);
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
      return;
    }

    // Linha vazia — fecha lista/tabela se abertas
    if (line.trim() === "") {
      flushList(`flush-${key}`);
      flushTable(`table-${key}`);
      nodes.push(<br key={key} />);
      return;
    }

    // Texto normal
    flushList(`flush-${key}`);
    flushTable(`table-${key}`);
    nodes.push(
      <p key={key} className="leading-relaxed">
        {renderInline(line)}
      </p>
    );
  });

  flushList("flush-end");
  flushTable("table-end");
  return nodes;
}

// ─── Componente de bolha de mensagem ─────────────────────────────
function Bolha({ msg }: { msg: Mensagem }) {
  const ehAssistente = msg.role === "assistant";
  return (
    <div
      className={clsx(
        "flex gap-3 max-w-[85%]",
        ehAssistente ? "self-start" : "self-end flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
          ehAssistente
            ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
        )}
      >
        {ehAssistente ? <RiRobot2Line size={16} /> : "EU"}
      </div>

      {/* Balão */}
      <div
        className={clsx(
          "px-4 py-3 rounded-2xl text-sm",
          ehAssistente
            ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm"
            : "bg-blue-600 text-white rounded-tr-sm"
        )}
      >
        {ehAssistente ? renderMarkdown(msg.content) : msg.content}
      </div>
    </div>
  );
}

// ─── Indicador de digitação ───────────────────────────────────────
function Digitando() {
  return (
    <div className="flex gap-3 max-w-[85%] self-start">
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
        <RiRobot2Line size={16} />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export default function ChatbotPage() {
  const { dados: transacoes } = useCollection<Transacao>("financeiro");
  const { dados: clientes } = useCollection<Cliente>("clientes");
  const { dados: produtos } = useCollection<Produto>("produtos");
  const { dados: tarefas } = useCollection<Tarefa>("tarefas");
  const { plano, chatUsage } = usePermissoes();

  const mesAtual = new Date().toISOString().slice(0, 7);
  const limite = PLANOS[plano].limite;
  const usageCount = chatUsage?.mes === mesAtual ? (chatUsage.count ?? 0) : 0;
  const limiteAtingido = isFinite(limite) && usageCount >= limite;

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ─── Chats salvos ─────────────────────────────────────────────
  const [chatsSalvos, setChatsSalvos] = useState<ChatSalvo[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [chatAtualId, setChatAtualId] = useState<string | null>(null);
  const [salvandoToast, setSalvandoToast] = useState(false);

  // Carrega chats do localStorage na montagem
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChatsSalvos(JSON.parse(raw) as ChatSalvo[]);
    } catch {
      // localStorage indisponível ou JSON corrompido
    }
  }, []);

  const persistir = (lista: ChatSalvo[]) => {
    setChatsSalvos(lista);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // quota excedida ou modo privado
    }
  };

  const salvarChat = () => {
    if (mensagens.length === 0) return;
    const primeiraMsgUsuario = mensagens.find((m) => m.role === "user")?.content ?? "Conversa sem título";
    const titulo = primeiraMsgUsuario.length > 60 ? primeiraMsgUsuario.slice(0, 57) + "…" : primeiraMsgUsuario;
    const agora = new Date().toISOString();

    // Se já tem ID (chat previamente salvo), atualiza ao invés de criar novo
    if (chatAtualId) {
      const atualizado = chatsSalvos.map((c) =>
        c.id === chatAtualId ? { ...c, titulo, mensagens, salvadoEm: agora } : c
      );
      persistir(atualizado);
    } else {
      const novo: ChatSalvo = { id: agora, titulo, mensagens, salvadoEm: agora };
      const atualizado = [novo, ...chatsSalvos];
      persistir(atualizado);
      setChatAtualId(agora);
    }

    // Toast feedback
    setSalvandoToast(true);
    setTimeout(() => setSalvandoToast(false), 2000);
  };

  const carregarChat = (chat: ChatSalvo) => {
    setMensagens(chat.mensagens);
    setChatAtualId(chat.id);
    setErro(null);
    setInput("");
    setPainelAberto(false);
  };

  const excluirChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const atualizado = chatsSalvos.filter((c) => c.id !== id);
    persistir(atualizado);
    if (chatAtualId === id) setChatAtualId(null);
  };

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Rola para o final sempre que novas mensagens chegam
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  const enviar = async (texto: string) => {
    const textoFinal = texto.trim();
    if (!textoFinal || carregando || limiteAtingido) return;

    setErro(null);
    setInput("");

    const novaMensagem: Mensagem = { role: "user", content: textoFinal };
    const historicoAtualizado: Mensagem[] = [...mensagens, novaMensagem];
    setMensagens(historicoAtualizado);
    setCarregando(true);

    // Adiciona placeholder da resposta do assistente
    setMensagens((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const contexto = buildContexto(transacoes, clientes, produtos, tarefas);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historicoAtualizado.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          contexto,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || "Erro ao conectar com o modelo.");
      }

      // Leitura do stream SSE
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const linhas = buffer.split("\n");
        buffer = linhas.pop() ?? "";

        for (const linha of linhas) {
          if (!linha.startsWith("data: ")) continue;
          const data = linha.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta: string = parsed.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;

            setMensagens((prev) => {
              const copia = [...prev];
              const ultima = copia[copia.length - 1];
              if (ultima?.role === "assistant") {
                copia[copia.length - 1] = {
                  ...ultima,
                  content: ultima.content + delta,
                };
              }
              return copia;
            });
          } catch {
            // chunk inválido — ignora
          }
        }
      }
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado. Tente novamente."
      );
      setMensagens((prev) =>
        prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev
      );
    } finally {
      setCarregando(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar(input);
    }
  };

  const reiniciar = () => {
    setMensagens([]);
    setErro(null);
    setInput("");
    setChatAtualId(null);
    inputRef.current?.focus();
  };

  const semMensagens = mensagens.length === 0;

  return (
    <DashboardLayout titulo="ChatBot IA">
      {/* Toast de salvo */}
      {salvandoToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl shadow-lg">
          <FiBookmark size={14} />
          {chatAtualId ? "Chat atualizado!" : "Chat salvo!"}
        </div>
      )}

      <div className="flex flex-col h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] max-w-3xl mx-auto">
        {/* Header do chat */}
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
              <RiRobot2Line size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Assistente Elephens
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                nvidia/nemotron-3-nano-30b · OpenRouter
              </p>
            </div>
          </div>

          {/* Indicador de uso + botões */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Badge de plano e uso */}
            {isFinite(limite) ? (
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={clsx(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    limiteAtingido
                      ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                      : usageCount / limite >= 0.75
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  )}>
                    {PLANOS[plano].label}
                  </span>
                  <span className={clsx(
                    "text-xs",
                    limiteAtingido ? "text-red-500 font-semibold" : "text-gray-400"
                  )}>
                    {usageCount}/{limite} msgs
                  </span>
                </div>
                <div className="w-28 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      limiteAtingido ? "bg-red-500" : usageCount / limite >= 0.75 ? "bg-amber-400" : "bg-blue-500"
                    )}
                    style={{ width: `${Math.min((usageCount / limite) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                {PLANOS[plano].label} · Ilimitado
              </span>
            )}

            {/* Salvar / Atualizar chat */}
            {!semMensagens && (
              <button
                onClick={salvarChat}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <FiBookmark size={13} />
                {chatAtualId ? "Atualizar" : "Salvar chat"}
              </button>
            )}

            {/* Lista de chats salvos */}
            {chatsSalvos.length > 0 && (
              <div>
                <button
                  onClick={() => setPainelAberto((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <FiList size={13} />
                  Chats salvos
                </button>

                {painelAberto && (
                  <div className="absolute right-0 top-full mt-1 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Chats salvos
                      </span>
                      <button
                        onClick={() => setPainelAberto(false)}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                    <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                      {chatsSalvos.map((chat) => (
                        <li
                          key={chat.id}
                          onClick={() => carregarChat(chat)}
                          className={clsx(
                            "group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                            chatAtualId === chat.id && "bg-blue-50 dark:bg-blue-900/20"
                          )}
                        >
                          <FiBookmark
                            size={14}
                            className={clsx(
                              "mt-0.5 shrink-0",
                              chatAtualId === chat.id
                                ? "text-blue-500"
                                : "text-gray-300 dark:text-gray-600"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-gray-100 truncate">
                              {chat.titulo}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatarData(chat.salvadoEm)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => excluirChat(chat.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 transition-all shrink-0"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Nova conversa */}
            {!semMensagens && (
              <button
                onClick={reiniciar}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FiRefreshCw size={13} />
                Nova conversa
              </button>
            )}
          </div>
        </div>

        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 flex flex-col gap-3">
          {semMensagens ? (
            /* Tela inicial com sugestões */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FiMessageSquare size={26} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    Olá! Sou seu assistente de gestão.
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Tenho acesso aos seus dados financeiros, produtos, clientes e
                    tarefas em tempo real.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Histórico de mensagens */
            <>
              {mensagens.map((msg, i) =>
                msg.role === "assistant" && msg.content === "" && carregando ? (
                  <Digitando key={i} />
                ) : (
                  <Bolha key={i} msg={msg} />
                )
              )}
            </>
          )}

          {/* Erro */}
          {erro && (
            <p className="self-stretch text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              {erro}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className={clsx(
          "mt-3 flex gap-2 items-end border rounded-2xl px-4 py-3",
          limiteAtingido
            ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        )}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={limiteAtingido ? "Limite de mensagens atingido. Fale com o administrador." : "Pergunte sobre seu negócio... (Enter para enviar)"}
            disabled={carregando || limiteAtingido}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={() => enviar(input)}
            disabled={carregando || !input.trim() || limiteAtingido}
            className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
            aria-label="Enviar"
          >
            <FiSend size={15} />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-2">
          Shift+Enter para nova linha · Enter para enviar
        </p>
      </div>
    </DashboardLayout>
  );
}


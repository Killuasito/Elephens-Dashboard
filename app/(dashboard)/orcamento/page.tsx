"use client";

import { useState, useMemo } from "react";
import { runTransaction, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/ui/StatCard";
import FormInput from "@/components/ui/FormInput";
import { useCollection, deleteDocument } from "@/hooks/useFirestore";
import { useAuth } from "@/hooks/useAuth";
import { Orcamento, OrcamentoItem, Cliente, Coluna } from "@/types";
import {
  FiPlus, FiX, FiTrash2, FiEdit2, FiFileText,
  FiCheck, FiSend, FiClock, FiCheckCircle, FiXCircle, FiDownload,
} from "react-icons/fi";
import clsx from "clsx";

// ─── Helpers de formatação ────────────────────────────────────────
const fmt = (v: number) =>
  `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// "2026-04-02" → "02/04/2026"
const fmtData = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const hoje = () => new Date().toISOString().split("T")[0];

const gerarNumero = (lista: Orcamento[]) => {
  const ultimo = lista
    .map((o) => parseInt(o.numero.replace(/\D/g, ""), 10))
    .filter(Boolean);
  const proximo = ultimo.length > 0 ? Math.max(...ultimo) + 1 : 1;
  return `ORC-${String(proximo).padStart(4, "0")}`;
};

// ─── Core dos badges de status ────────────────────────────────────
const STATUS_META: Record<
  Orcamento["status"],
  { label: string; cls: string }
> = {
  rascunho: {
    label: "Rascunho",
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  },
  enviado: {
    label: "Enviado",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  aprovado: {
    label: "Aprovado",
    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  recusado: {
    label: "Recusado",
    cls: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
  },
};

function BadgeStatus({ status }: { status: Orcamento["status"] }) {
  const { label, cls } = STATUS_META[status];
  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold", cls)}>
      {label}
    </span>
  );
}

// ─── Colunas da tabela principal ──────────────────────────────────
const colunas: Coluna[] = [
  { chave: "numero",       label: "Nº" },
  { chave: "titulo",       label: "Título" },
  { chave: "clienteNome",  label: "Cliente" },
  { chave: "dataEmissao",  label: "Emissão" },
  { chave: "dataValidade", label: "Validade" },
  { chave: "totalFmt",     label: "Total" },
  { chave: "statusLabel",  label: "Status" },
];

// ─── Estado inicial do formulário ─────────────────────────────────
const formInicial = {
  titulo: "",
  clienteNome: "",
  clienteId: "",
  dataEmissao: hoje(),
  dataValidade: "",
  // ajustes financeiros
  desconto: "0",        // R$ absoluto
  descontoPerc: "0",    // %
  frete: "0",           // R$
  juros: "0",           // %
  multa: "0",           // %
  acrescimo: "0",       // R$ absoluto extra
  observacoes: "",
  status: "rascunho" as Orcamento["status"],
};

const itemInicial: Omit<OrcamentoItem, "total"> = {
  descricao: "",
  quantidade: 1,
  precoUnitario: 0,
};

const selectClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

// ─── Componente principal ─────────────────────────────────────────
export default function OrcamentoPage() {
  const { user } = useAuth();
  const { dados: orcamentos, loading } = useCollection<Orcamento>("orcamentos");
  const { dados: clientes } = useCollection<Cliente>("clientes");

  // ── Modal / form state ──────────────────────────────────────────
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(formInicial);
  const [itens, setItens] = useState<OrcamentoItem[]>([]);
  const [itemAtual, setItemAtual] = useState(itemInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // ── Visualização de orçamento ───────────────────────────────────
  const [visualizando, setVisualizando] = useState<Orcamento | null>(null);

  // ── Filtro de status ────────────────────────────────────────────
  const [filtroStatus, setFiltroStatus] = useState<Orcamento["status"] | "todos">("todos");

  // ─── Cálculos ──────────────────────────────────────────────────
  const subtotal      = itens.reduce((s, i) => s + i.total, 0);
  const desconto      = parseFloat(form.desconto)     || 0;
  const descontoPerc  = parseFloat(form.descontoPerc) || 0;
  const frete         = parseFloat(form.frete)        || 0;
  const jurosPerc     = parseFloat(form.juros)        || 0;
  const multaPerc     = parseFloat(form.multa)        || 0;
  const acrescimo     = parseFloat(form.acrescimo)    || 0;

  // desconto total = R$ fixo + percentual aplicado sobre o subtotal
  const totalDescontos = desconto + (subtotal * descontoPerc) / 100;
  // acréscimos = frete + valor extra + juros % + multa % sobre subtotal
  const totalAjustes   = frete + acrescimo + (subtotal * jurosPerc) / 100 + (subtotal * multaPerc) / 100;
  const total          = Math.max(subtotal - totalDescontos + totalAjustes, 0);

  // ─── Estatísticas ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const aprovados = orcamentos.filter((o) => o.status === "aprovado");
    const enviados  = orcamentos.filter((o) => o.status === "enviado");
    const abertos   = orcamentos.filter((o) => o.status === "rascunho" || o.status === "enviado");
    return {
      totalOrcamentos: orcamentos.length,
      valorAprovado: aprovados.reduce((s, o) => s + o.total, 0),
      valorAberto:   abertos.reduce((s, o) => s + o.total, 0),
      qtdEnviados:   enviados.length,
    };
  }, [orcamentos]);

  // ─── Tabela filtrada ───────────────────────────────────────────
  const linhas = useMemo(() => {
    const lista = filtroStatus === "todos"
      ? orcamentos
      : orcamentos.filter((o) => o.status === filtroStatus);

    return lista
      .slice()
      .sort((a, b) => (b.dataEmissao > a.dataEmissao ? 1 : -1))
      .map((o) => ({
        ...o,
        totalFmt: fmt(o.total),
        statusLabel: <BadgeStatus status={o.status} />,
      }));
  }, [orcamentos, filtroStatus]);

  // ─── Operações de itens ────────────────────────────────────────
  const adicionarItem = () => {
    if (!itemAtual.descricao.trim() || itemAtual.quantidade <= 0) return;
    const novoItem: OrcamentoItem = {
      ...itemAtual,
      total: itemAtual.quantidade * itemAtual.precoUnitario,
    };
    setItens((prev) => [...prev, novoItem]);
    setItemAtual(itemInicial);
  };

  const removerItem = (idx: number) =>
    setItens((prev) => prev.filter((_, i) => i !== idx));

  // ─── Salvar orçamento ──────────────────────────────────────────
  const handleSalvar = async () => {
    if (!form.titulo.trim() || !form.clienteNome.trim() || !form.dataValidade || itens.length === 0) return;
    if (!user) return;
    setSalvando(true);

    const numero = editandoId
      ? (orcamentos.find((o) => o.id === editandoId)?.numero ?? gerarNumero(orcamentos))
      : gerarNumero(orcamentos);

    const payload = {
      numero,
      titulo: form.titulo.trim(),
      clienteId: form.clienteId || "",
      clienteNome: form.clienteNome.trim(),
      dataEmissao: form.dataEmissao,
      dataValidade: form.dataValidade,
      itens,
      subtotal,
      desconto,
      descontoPerc,
      frete,
      juros: jurosPerc,
      multa: multaPerc,
      acrescimo,
      totalDescontos,
      totalAjustes,
      total,
      observacoes: form.observacoes.trim(),
      status: form.status,
      uid: user.uid,
    };

    try {
      await runTransaction(db, async (tx) => {
        if (editandoId) {
          tx.update(doc(db, "orcamentos", editandoId), {
            ...payload,
            atualizadoEm: serverTimestamp(),
          });
        } else {
          tx.set(doc(collection(db, "orcamentos")), {
            ...payload,
            criadoEm: serverTimestamp(),
          });
        }
      });
      fecharForm();
    } finally {
      setSalvando(false);
    }
  };

  const fecharForm = () => {
    setForm(formInicial);
    setItens([]);
    setItemAtual(itemInicial);
    setEditandoId(null);
    setMostrarForm(false);
  };

  const handleEditar = (orc: Orcamento) => {
    setForm({
      titulo: orc.titulo,
      clienteNome: orc.clienteNome,
      clienteId: orc.clienteId ?? "",
      dataEmissao: orc.dataEmissao,
      dataValidade: orc.dataValidade,
      desconto:      String(orc.desconto      ?? 0),
      descontoPerc:  String(orc.descontoPerc  ?? 0),
      frete:         String(orc.frete         ?? 0),
      juros:         String(orc.juros         ?? 0),
      multa:         String(orc.multa         ?? 0),
      acrescimo:     String(orc.acrescimo     ?? 0),
      observacoes: orc.observacoes ?? "",
      status: orc.status,
    });
    setItens(orc.itens);
    setEditandoId(orc.id);
    setMostrarForm(true);
  };

  const handleDeletar = async (orc: Orcamento) => {
    if (!confirm(`Remover o orçamento "${orc.numero} — ${orc.titulo}"?`)) return;
    await deleteDocument("orcamentos", orc.id);
  };

  const exportarPDF = (orc: Orcamento) => {
    const statusLabels: Record<Orcamento["status"], string> = {
      rascunho: "Rascunho",
      enviado: "Enviado",
      aprovado: "Aprovado",
      recusado: "Recusado",
    };

    const itensHTML = orc.itens
      .map(
        (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${item.descricao}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${item.quantidade}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.precoUnitario)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmt(item.total)}</td>
        </tr>`
      )
      .join("");

    const descontoHTML = (() => {
      const totalDesc = orc.totalDescontos ?? orc.desconto ?? 0;
      if (totalDesc <= 0) return "";
      const linhas = [];
      if ((orc.desconto ?? 0) > 0)
        linhas.push(`<tr><td style="text-align:right;color:#6b7280;padding:2px 0;font-size:12px">Desconto (R$)</td><td style="text-align:right;color:#ef4444;padding:2px 0 2px 24px;font-size:12px">- ${fmt(orc.desconto ?? 0)}</td></tr>`);
      if ((orc.descontoPerc ?? 0) > 0)
        linhas.push(`<tr><td style="text-align:right;color:#6b7280;padding:2px 0;font-size:12px">Desconto (${orc.descontoPerc}%)</td><td style="text-align:right;color:#ef4444;padding:2px 0 2px 24px;font-size:12px">- ${fmt(orc.subtotal * (orc.descontoPerc ?? 0) / 100)}</td></tr>`);
      return `${linhas.join("")}<tr><td style="text-align:right;color:#ef4444;font-weight:700;padding:4px 0">(-) Total Descontos</td><td style="text-align:right;color:#ef4444;font-weight:700;padding:4px 0 4px 24px">- ${fmt(totalDesc)}</td></tr>`;
    })();

    const acrescimosHTML = (() => {
      const total = orc.totalAjustes ?? 0;
      if (total <= 0) return "";
      const linhas = [];
      if ((orc.frete ?? 0) > 0)
        linhas.push(`<tr><td style="text-align:right;color:#6b7280;padding:2px 0;font-size:12px">Frete</td><td style="text-align:right;color:#d97706;padding:2px 0 2px 24px;font-size:12px">+ ${fmt(orc.frete ?? 0)}</td></tr>`);
      if ((orc.juros ?? 0) > 0)
        linhas.push(`<tr><td style="text-align:right;color:#6b7280;padding:2px 0;font-size:12px">Juros (${orc.juros}%)</td><td style="text-align:right;color:#d97706;padding:2px 0 2px 24px;font-size:12px">+ ${fmt(orc.subtotal * (orc.juros ?? 0) / 100)}</td></tr>`);
      if ((orc.multa ?? 0) > 0)
        linhas.push(`<tr><td style="text-align:right;color:#6b7280;padding:2px 0;font-size:12px">Multa (${orc.multa}%)</td><td style="text-align:right;color:#d97706;padding:2px 0 2px 24px;font-size:12px">+ ${fmt(orc.subtotal * (orc.multa ?? 0) / 100)}</td></tr>`);
      if ((orc.acrescimo ?? 0) > 0)
        linhas.push(`<tr><td style="text-align:right;color:#6b7280;padding:2px 0;font-size:12px">Acréscimo (R$)</td><td style="text-align:right;color:#d97706;padding:2px 0 2px 24px;font-size:12px">+ ${fmt(orc.acrescimo ?? 0)}</td></tr>`);
      return `${linhas.join("")}<tr><td style="text-align:right;color:#d97706;font-weight:700;padding:4px 0">(+) Total Acréscimos</td><td style="text-align:right;color:#d97706;font-weight:700;padding:4px 0 4px 24px">+ ${fmt(total)}</td></tr>`;
    })();

    const obsHTML = orc.observacoes
      ? `<div style="margin-top:24px;background:#f9fafb;border-radius:10px;padding:16px">
           <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px">Observações</p>
           <p style="font-size:13px;color:#374151;white-space:pre-wrap;margin:0">${orc.observacoes}</p>
         </div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${orc.numero} — ${orc.titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #fff; padding: 40px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; font-weight: 700; }
    th.right { text-align: right; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div>
      <p style="font-size:11px;color:#9ca3af;font-family:monospace;margin-bottom:4px">${orc.numero}</p>
      <h1 style="font-size:22px;font-weight:700;color:#111827">${orc.titulo}</h1>
    </div>
    <span style="padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;background:#f3f4f6;color:#374151">${statusLabels[orc.status]}</span>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px">
    <div style="background:#f9fafb;border-radius:10px;padding:16px">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Cliente</p>
      <p style="font-size:14px;font-weight:600">${orc.clienteNome}</p>
    </div>
    <div style="background:#f9fafb;border-radius:10px;padding:16px">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Emissão</p>
      <p style="font-size:14px;font-weight:600">${fmtData(orc.dataEmissao)}</p>
    </div>
    <div style="background:#f9fafb;border-radius:10px;padding:16px">
      <p style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Válido até</p>
      <p style="font-size:14px;font-weight:600">${fmtData(orc.dataValidade)}</p>
    </div>
  </div>

  <table style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <thead><tr>
      <th>Descrição</th>
      <th class="right" style="text-align:right">Qtd</th>
      <th class="right" style="text-align:right">Unit.</th>
      <th class="right" style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${itensHTML}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
    <table style="width:auto">
      <tbody>
        <tr><td style="text-align:right;color:#6b7280;padding:4px 0">Subtotal</td><td style="text-align:right;font-weight:600;padding:4px 0 4px 24px">${fmt(orc.subtotal)}</td></tr>
        ${descontoHTML}
        ${acrescimosHTML}
        <tr style="border-top:2px solid #e5e7eb">
          <td style="text-align:right;font-weight:700;padding:8px 0 0">Total</td>
          <td style="text-align:right;font-size:20px;font-weight:700;color:#2563eb;padding:8px 0 0 24px">${fmt(orc.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${obsHTML}

  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="padding:10px 28px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Imprimir / Salvar PDF</button>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  const handleAlterarStatus = async (orc: Orcamento, novoStatus: Orcamento["status"]) => {
    await runTransaction(db, async (tx) => {
      tx.update(doc(db, "orcamentos", orc.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
    });
  };

  // ─── JSX ───────────────────────────────────────────────────────
  return (
    <DashboardLayout titulo="Orçamentos">
      <div className="space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            titulo="Total de Orçamentos"
            valor={stats.totalOrcamentos}
            icone={<FiFileText size={20} />}
            cor="blue"
          />
          <StatCard
            titulo="Valor Aprovado"
            valor={fmt(stats.valorAprovado)}
            icone={<FiCheckCircle size={20} />}
            cor="green"
          />
          <StatCard
            titulo="Em Aberto"
            valor={fmt(stats.valorAberto)}
            icone={<FiClock size={20} />}
            cor="amber"
          />
          <StatCard
            titulo="Enviados aguardando"
            valor={stats.qtdEnviados}
            icone={<FiSend size={20} />}
            cor="blue"
          />
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["todos", "rascunho", "enviado", "aprovado", "recusado"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                  filtroStatus === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                {s === "todos" ? "Todos" : STATUS_META[s].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setForm({ ...formInicial, dataEmissao: hoje() }); setMostrarForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <FiPlus size={16} />
            Novo Orçamento
          </button>
        </div>

        {/* ── Tabela ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
          ) : linhas.length === 0 ? (
            <div className="p-12 flex flex-col items-center gap-3 text-center">
              <FiFileText size={32} className="text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum orçamento encontrado</p>
              <p className="text-sm text-gray-400">Crie seu primeiro orçamento clicando em &ldquo;Novo Orçamento&rdquo;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {colunas.map((c) => (
                      <th key={c.chave} className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-xs">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {linhas.map((orc) => (
                    <tr
                      key={orc.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">{orc.numero}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 font-medium max-w-50 truncate">{orc.titulo}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{orc.clienteNome}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtData(orc.dataEmissao)}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtData(orc.dataValidade)}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 font-semibold">{orc.totalFmt}</td>
                      <td className="px-4 py-3">{orc.statusLabel}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ações de status rápidas */}
                          {orc.status === "rascunho" && (
                            <button
                              onClick={() => handleAlterarStatus(orc, "enviado")}
                              title="Marcar como Enviado"
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <FiSend size={14} />
                            </button>
                          )}
                          {orc.status === "enviado" && (
                            <>
                              <button
                                onClick={() => handleAlterarStatus(orc, "aprovado")}
                                title="Aprovar"
                                className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                              >
                                <FiCheck size={14} />
                              </button>
                              <button
                                onClick={() => handleAlterarStatus(orc, "recusado")}
                                title="Recusar"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <FiXCircle size={14} />
                              </button>
                            </>
                          )}
                          {/* Exportar PDF */}
                          <button
                            onClick={() => exportarPDF(orc)}
                            title="Exportar PDF"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <FiDownload size={14} />
                          </button>
                          {/* Visualizar */}
                          <button
                            onClick={() => setVisualizando(orc)}
                            title="Visualizar"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <FiFileText size={14} />
                          </button>
                          {/* Editar */}
                          <button
                            onClick={() => handleEditar(orc)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          {/* Deletar */}
                          <button
                            onClick={() => handleDeletar(orc)}
                            title="Remover"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          Modal de criação / edição
      ────────────────────────────────────────────────────────── */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl my-6">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {editandoId ? "Editar Orçamento" : "Novo Orçamento"}
              </h2>
              <button onClick={fecharForm} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ── Dados gerais ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    label="Título / Objeto do Orçamento"
                    value={form.titulo}
                    onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                    placeholder="Ex: Desenvolvimento de sistema ERP"
                  />
                </div>

                {/* Cliente — select ou texto livre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Cliente
                  </label>
                  {clientes.length > 0 ? (
                    <select
                      value={form.clienteId}
                      onChange={(e) => {
                        const c = clientes.find((c) => c.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          clienteId: e.target.value,
                          clienteNome: c?.nome ?? "",
                        }));
                      }}
                      className={selectClass}
                    >
                      <option value="">Selecione ou escreva abaixo</option>
                      {clientes.filter((c) => c.status === "ativo").map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  ) : null}
                  {(!form.clienteId || clientes.length === 0) && (
                    <div className={clientes.length > 0 ? "mt-2" : ""}>
                      <FormInput
                        label=""
                        value={form.clienteNome}
                        onChange={(e) => setForm((f) => ({ ...f, clienteNome: e.target.value, clienteId: "" }))}
                        placeholder="Nome do cliente"
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Orcamento["status"] }))}
                    className={selectClass}
                  >
                    {(["rascunho", "enviado", "aprovado", "recusado"] as const).map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>

                <FormInput
                  label="Data de Emissão"
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => setForm((f) => ({ ...f, dataEmissao: e.target.value }))}
                />
                <FormInput
                  label="Data de Validade"
                  type="date"
                  value={form.dataValidade}
                  onChange={(e) => setForm((f) => ({ ...f, dataValidade: e.target.value }))}
                />
              </div>

              {/* ── Itens do orçamento ── */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Itens / Serviços
                </h3>

                {/* Linha de adição de item */}
                <div className="grid grid-cols-12 gap-2 mb-3">
                  <div className="col-span-12 sm:col-span-5">
                    <FormInput
                      label=""
                      value={itemAtual.descricao}
                      onChange={(e) => setItemAtual((i) => ({ ...i, descricao: e.target.value }))}
                      placeholder="Descrição do item / serviço"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <FormInput
                      label=""
                      type="number"
                      value={String(itemAtual.quantidade)}
                      onChange={(e) => setItemAtual((i) => ({ ...i, quantidade: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      placeholder="Qtd"
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-4">
                    <FormInput
                      label=""
                      type="number"
                      value={String(itemAtual.precoUnitario)}
                      onChange={(e) => setItemAtual((i) => ({ ...i, precoUnitario: Math.max(0, parseFloat(e.target.value) || 0) }))}
                      placeholder="Preço unitário (R$)"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex items-end">
                    <button
                      onClick={adicionarItem}
                      disabled={!itemAtual.descricao.trim() || itemAtual.quantidade <= 0}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"
                    >
                      <FiPlus size={18} />
                    </button>
                  </div>
                </div>

                {/* Lista de itens adicionados */}
                {itens.length > 0 && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800/60">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Unit.</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {itens.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-2 text-gray-800 dark:text-gray-100">{item.descricao}</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{item.quantidade}</td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{fmt(item.precoUnitario)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800 dark:text-gray-100">{fmt(item.total)}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => removerItem(idx)} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                <FiTrash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Totais + ajustes financeiros ── */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Ajustes Financeiros</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {/* Desconto R$ */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Desconto (R$)</label>
                    <input type="number" min="0" step="0.01" value={form.desconto}
                      onChange={(e) => setForm((f) => ({ ...f, desconto: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {/* Desconto % */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Desconto (%)</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.descontoPerc}
                      onChange={(e) => setForm((f) => ({ ...f, descontoPerc: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {/* Frete */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Frete (R$)</label>
                    <input type="number" min="0" step="0.01" value={form.frete}
                      onChange={(e) => setForm((f) => ({ ...f, frete: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {/* Juros % */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Juros (%)</label>
                    <input type="number" min="0" step="0.01" value={form.juros}
                      onChange={(e) => setForm((f) => ({ ...f, juros: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {/* Multa % */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Multa (%)</label>
                    <input type="number" min="0" step="0.01" value={form.multa}
                      onChange={(e) => setForm((f) => ({ ...f, multa: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {/* Acréscimo R$ */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Acréscimo (R$)</label>
                    <input type="number" min="0" step="0.01" value={form.acrescimo}
                      onChange={(e) => setForm((f) => ({ ...f, acrescimo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                {/* Resumo dos totais */}
                <div className="flex flex-col items-end gap-1.5 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-6">
                    <span className="text-gray-500 dark:text-gray-400 w-40 text-right">Subtotal</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100 w-32 text-right">{fmt(subtotal)}</span>
                  </div>
                  {totalDescontos > 0 && (
                    <div className="flex items-center gap-6">
                      <span className="text-red-500 w-40 text-right">(-) Descontos</span>
                      <span className="font-semibold text-red-500 w-32 text-right">- {fmt(totalDescontos)}</span>
                    </div>
                  )}
                  {totalAjustes > 0 && (
                    <div className="flex items-center gap-6">
                      <span className="text-amber-600 dark:text-amber-400 w-40 text-right">(+) Acréscimos</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400 w-32 text-right">+ {fmt(totalAjustes)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-6 border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                    <span className="font-bold text-gray-700 dark:text-gray-200 w-40 text-right">Total</span>
                    <span className="font-bold text-xl text-blue-600 dark:text-blue-400 w-32 text-right">{fmt(total)}</span>
                  </div>
                </div>
              </div>

              {/* ── Observações ── */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Observações / Condições de pagamento
                </label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Ex: Pagamento em 30/60/90 dias. IMP incluso."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* ── Botões ── */}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={fecharForm} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando || !form.titulo.trim() || !form.clienteNome.trim() || !form.dataValidade || itens.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Criar Orçamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          Modal de visualização (preview do orçamento)
      ────────────────────────────────────────────────────────── */}
      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl my-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-400 font-mono">{visualizando.numero}</p>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{visualizando.titulo}</h2>
              </div>
              <button onClick={() => setVisualizando(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Metadados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Cliente</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{visualizando.clienteNome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Emissão</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtData(visualizando.dataEmissao)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Validade</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{fmtData(visualizando.dataValidade)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                  <BadgeStatus status={visualizando.status} />
                </div>
              </div>

              {/* Itens */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Qtd</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unit.</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {visualizando.itens.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-gray-800 dark:text-gray-100">{item.descricao}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">{item.quantidade}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-400">{fmt(item.precoUnitario)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800 dark:text-gray-100">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totais */}
              <div className="flex flex-col items-end gap-1.5 text-sm">
                <div className="flex gap-8">
                  <span className="text-gray-500 w-40 text-right">Subtotal</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-100 w-32 text-right">{fmt(visualizando.subtotal)}</span>
                </div>
                {(visualizando.totalDescontos ?? visualizando.desconto) > 0 && (
                  <div className="flex gap-8">
                    <span className="text-red-500 w-40 text-right">(-) Descontos</span>
                    <span className="font-semibold text-red-500 w-32 text-right">- {fmt(visualizando.totalDescontos ?? visualizando.desconto)}</span>
                  </div>
                )}
                {(visualizando.totalAjustes ?? 0) > 0 && (
                  <div className="flex gap-8">
                    <span className="text-amber-600 dark:text-amber-400 w-40 text-right">(+) Acréscimos</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 w-32 text-right">+ {fmt(visualizando.totalAjustes ?? 0)}</span>
                  </div>
                )}
                {/* Detalhamento individual só se existirem valores */}
                {(visualizando.frete ?? 0) > 0 && (
                  <div className="flex gap-8">
                    <span className="text-gray-400 text-xs w-40 text-right">Frete</span>
                    <span className="text-gray-500 text-xs w-32 text-right">{fmt(visualizando.frete ?? 0)}</span>
                  </div>
                )}
                {(visualizando.juros ?? 0) > 0 && (
                  <div className="flex gap-8">
                    <span className="text-gray-400 text-xs w-40 text-right">Juros ({visualizando.juros}%)</span>
                    <span className="text-gray-500 text-xs w-32 text-right">{fmt(visualizando.subtotal * (visualizando.juros ?? 0) / 100)}</span>
                  </div>
                )}
                {(visualizando.multa ?? 0) > 0 && (
                  <div className="flex gap-8">
                    <span className="text-gray-400 text-xs w-40 text-right">Multa ({visualizando.multa}%)</span>
                    <span className="text-gray-500 text-xs w-32 text-right">{fmt(visualizando.subtotal * (visualizando.multa ?? 0) / 100)}</span>
                  </div>
                )}
                <div className="flex gap-8 border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                  <span className="font-bold text-gray-700 dark:text-gray-200 w-40 text-right">Total</span>
                  <span className="font-bold text-xl text-blue-600 dark:text-blue-400 w-32 text-right">{fmt(visualizando.total)}</span>
                </div>
              </div>

              {/* Observações */}
              {visualizando.observacoes && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observações</p>
                  <p className="whitespace-pre-wrap">{visualizando.observacoes}</p>
                </div>
              )}

              {/* Ações de status no preview */}
              <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  {visualizando.status === "rascunho" && (
                    <button
                      onClick={() => { handleAlterarStatus(visualizando, "enviado"); setVisualizando({ ...visualizando, status: "enviado" }); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      <FiSend size={13} /> Marcar como Enviado
                    </button>
                  )}
                  {visualizando.status === "enviado" && (
                    <>
                      <button
                        onClick={() => { handleAlterarStatus(visualizando, "aprovado"); setVisualizando({ ...visualizando, status: "aprovado" }); }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 rounded-xl transition-colors"
                      >
                        <FiCheck size={13} /> Aprovar
                      </button>
                      <button
                        onClick={() => { handleAlterarStatus(visualizando, "recusado"); setVisualizando({ ...visualizando, status: "recusado" }); }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
                      >
                        <FiXCircle size={13} /> Recusar
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportarPDF(visualizando)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <FiDownload size={13} /> Exportar PDF
                  </button>
                  <button
                    onClick={() => setVisualizando(null)}
                    className="px-5 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

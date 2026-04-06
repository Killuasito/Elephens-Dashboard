"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import { useAuth } from "@/hooks/useAuth";
import { useTodasPermissoes, atualizarPermissao, atualizarNome, atualizarNomeApp, atualizarPlano } from "@/hooks/usePermissoes";
import { MODULOS_IDS, MODULOS_INFO, ModuloId } from "@/lib/modulos";
import { PLANOS, PlanoId } from "@/lib/planos";
import { Permissao } from "@/types";
import {
  FiShield, FiUsers, FiEdit2, FiCheck,
  FiUserPlus, FiTrash2, FiX, FiAlertTriangle,
  FiMail, FiLock, FiUser,
} from "react-icons/fi";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

const inputClass =
  "w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";

// ─── Modal: Criar Usuário ──────────────────────────────────────────────────────
function ModalCriarUsuario({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleCriar = async () => {
    setErro(null);
    if (!email.trim() || !senha.trim()) { setErro("E-mail e senha são obrigatórios."); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha, nome: nome.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao criar usuário."); setSalvando(false); return; }
      onClose();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500"><FiUserPlus size={18} /></div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Criar novo usuário</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"><FiX size={16} /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome <span className="text-gray-400 font-normal">(opcional)</span></label>
            <div className="relative">
              <FiUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Nome do usuário" value={nome} onChange={(e) => setNome(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
            <div className="relative">
              <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" placeholder="usuario@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha <span className="text-gray-400 font-normal">(mín. 6 caracteres)</span></label>
            <div className="relative">
              <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCriar()} className={inputClass} />
            </div>
          </div>

          {erro && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={salvando} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Cancelar</button>
          <button onClick={handleCriar} disabled={salvando} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50">{salvando ? "Criando..." : "Criar usuário"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Confirmar Exclusão ─────────────────────────────────────────────────
function ModalExcluirUsuario({ usuario, onClose }: { usuario: Permissao; onClose: () => void }) {
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleExcluir = async () => {
    setErro(null);
    setExcluindo(true);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: usuario.uid }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao excluir."); setExcluindo(false); return; }
      onClose();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setExcluindo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center gap-3 text-red-500">
          <FiAlertTriangle size={22} />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Excluir usuário</h3>
        </div>
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 space-y-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{usuario.nome || "Sem nome"}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{usuario.email}</p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Esta ação <strong>remove permanentemente</strong> a conta de autenticação e as permissões deste usuário. Os dados cadastrados permanecem no banco.
        </p>
        {erro && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={excluindo} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">Cancelar</button>
          <button onClick={handleExcluir} disabled={excluindo} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-40">{excluindo ? "Excluindo..." : "Confirmar exclusão"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const { usuarios, loading } = useTodasPermissoes();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState("");
  const [editandoNomeApp, setEditandoNomeApp] = useState<string | null>(null);
  const [nomeAppTemp, setNomeAppTemp] = useState("");
  const [modalCriar, setModalCriar] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Permissao | null>(null);

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-3">
          <FiShield size={48} className="text-gray-300 dark:text-gray-700" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Área restrita ao administrador.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const handleToggle = async (uid: string, modulo: ModuloId, valor: boolean) => {
    const chave = `${uid}-${modulo}`;
    setSalvando(chave);
    await atualizarPermissao(uid, modulo, valor);
    setSalvando(null);
  };

  const handleSalvarNome = async (uid: string) => {
    await atualizarNome(uid, nomeTemp);
    setEditandoNome(null);
    setNomeTemp("");
  };

  const handleSalvarNomeApp = async (uid: string) => {
    await atualizarNomeApp(uid, nomeAppTemp);
    setEditandoNomeApp(null);
    setNomeAppTemp("");
  };

  const handleAtualizarPlano = async (uid: string, plano: PlanoId) => {
    await atualizarPlano(uid, plano);
  };

  // Exclui o próprio admin da lista
  const outrosUsuarios = usuarios.filter((u) => u.email !== ADMIN_EMAIL);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Modais */}
        {modalCriar && <ModalCriarUsuario onClose={() => setModalCriar(false)} />}
        {usuarioParaExcluir && (
          <ModalExcluirUsuario usuario={usuarioParaExcluir} onClose={() => setUsuarioParaExcluir(null)} />
        )}

        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
              <FiUsers size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{outrosUsuarios.length} usuário(s) cadastrado(s)</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Gerencie contas, permissões e nomes do sistema.</p>
            </div>
          </div>
          <button
            onClick={() => setModalCriar(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
          >
            <FiUserPlus size={15} />
            Criar usuário
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Carregando usuários...</p>
        ) : outrosUsuarios.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
            <FiUsers size={36} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum usuário cadastrado ainda.</p>
            <button onClick={() => setModalCriar(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              <FiUserPlus size={14} /> Criar primeiro usuário
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {outrosUsuarios.map((usuario) => {
              const modulosAtivos = MODULOS_IDS.filter(
                (m) => usuario.modulos?.[m] ?? true
              ).length;

              return (
                <div
                  key={usuario.uid}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  {/* Cabeçalho do card */}
                  <div className="flex items-start justify-between mb-5 gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Nome editável */}
                      {editandoNome === usuario.uid ? (
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            autoFocus
                            value={nomeTemp}
                            onChange={(e) => setNomeTemp(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSalvarNome(usuario.uid);
                              if (e.key === "Escape") { setEditandoNome(null); setNomeTemp(""); }
                            }}
                            placeholder="Nome do usuário"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={() => handleSalvarNome(usuario.uid)} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                            <FiCheck size={14} />
                          </button>
                          <button onClick={() => { setEditandoNome(null); setNomeTemp(""); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                            <FiX size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/nome mb-0.5">
                          <p className="font-semibold text-gray-800 dark:text-gray-100">
                            {usuario.nome || <span className="text-gray-400 italic font-normal text-sm">Sem nome</span>}
                          </p>
                          <button
                            onClick={() => { setEditandoNome(usuario.uid); setNomeTemp(usuario.nome ?? ""); }}
                            className="opacity-0 group-hover/nome:opacity-100 p-1 rounded text-gray-400 hover:text-blue-600 transition-all"
                            title="Editar nome"
                          >
                            <FiEdit2 size={13} />
                          </button>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">{usuario.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 select-all">{usuario.uid}</p>

                      {/* Plano ChatBot */}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500">Plano ChatBot</span>
                          <select
                            value={usuario.plano ?? "basic"}
                            onChange={(e) => handleAtualizarPlano(usuario.uid, e.target.value as PlanoId)}
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          >
                            {(Object.keys(PLANOS) as PlanoId[]).map((p) => (
                              <option key={p} value={p}>
                                {PLANOS[p].label} — {isFinite(PLANOS[p].limite) ? `${PLANOS[p].limite}/mês` : "Ilimitado"}
                              </option>
                            ))}
                          </select>
                        </div>
                        {(() => {
                          const mesAtual = new Date().toISOString().slice(0, 7);
                          const plano = usuario.plano ?? "basic";
                          const limite = PLANOS[plano].limite;
                          const count = usuario.chatUsage?.mes === mesAtual ? (usuario.chatUsage?.count ?? 0) : 0;
                          if (!isFinite(limite)) return null;
                          const pct = Math.min((count / limite) * 100, 100);
                          return (
                            <div className="flex items-center gap-2 min-w-30">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-blue-500"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-xs whitespace-nowrap ${count >= limite ? "text-red-500 font-semibold" : "text-gray-400 dark:text-gray-500"}`}>
                                {count}/{limite}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Nome na Sidebar */}
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Nome na Sidebar</p>
                        {editandoNomeApp === usuario.uid ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              value={nomeAppTemp}
                              onChange={(e) => setNomeAppTemp(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSalvarNomeApp(usuario.uid);
                                if (e.key === "Escape") { setEditandoNomeApp(null); setNomeAppTemp(""); }
                              }}
                              placeholder="Ex: Financeiro Tiago"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button onClick={() => handleSalvarNomeApp(usuario.uid)} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                              <FiCheck size={14} />
                            </button>
                            <button onClick={() => { setEditandoNomeApp(null); setNomeAppTemp(""); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                              <FiX size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/nomeapp">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {usuario.nomeApp || <span className="text-gray-400 italic font-normal">🐘 Elephens (padrão)</span>}
                            </p>
                            <button
                              onClick={() => { setEditandoNomeApp(usuario.uid); setNomeAppTemp(usuario.nomeApp ?? ""); }}
                              className="opacity-0 group-hover/nomeapp:opacity-100 p-1 rounded text-gray-400 hover:text-blue-600 transition-all"
                              title="Editar nome do app"
                            >
                              <FiEdit2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge + Plano + Excluir */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                        {modulosAtivos}/{MODULOS_IDS.length} módulos
                      </span>

                      <button
                        onClick={() => setUsuarioParaExcluir(usuario)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <FiTrash2 size={13} /> Excluir
                      </button>
                    </div>
                  </div>

                  {/* Grid de módulos com toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {MODULOS_IDS.map((modulo) => {
                      const info = MODULOS_INFO[modulo];
                      const ativo = usuario.modulos?.[modulo] ?? true;
                      const chave = `${usuario.uid}-${modulo}`;

                      return (
                        <div
                          key={modulo}
                          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {info.label}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {info.descricao}
                            </p>
                          </div>
                          <ToggleSwitch
                            ativo={ativo}
                            onChange={(v) => handleToggle(usuario.uid, modulo, v)}
                            disabled={salvando === chave}
                          />
                        </div>
                      );
                    })}
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

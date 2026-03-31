"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { atualizarNome } from "@/hooks/usePermissoes";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { FiUser, FiMail, FiSave, FiTrash2, FiAlertTriangle } from "react-icons/fi";

export default function ConfiguracoesPage() {
  const { user } = useAuth();

  const [nome, setNome] = useState(user?.displayName ?? "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
  const [mostrarModalExcluir, setMostrarModalExcluir] = useState(false);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [resultadoExclusao, setResultadoExclusao] = useState<string | null>(null);

  const COLECOES = ["clientes", "produtos", "tarefas", "financeiro", "documentos"];

  const handleExcluirTudo = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setExcluindo(true);
    setResultadoExclusao(null);
    const linhas: string[] = [];
    try {
      for (const c of COLECOES) {
        const q = query(collection(db, c), where("uid", "==", uid));
        const snap = await getDocs(q);
        if (snap.empty) { linhas.push(`${c}: 0 removidos`); continue; }
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(doc(db, c, d.id)));
        await batch.commit();
        linhas.push(`${c}: ${snap.size} removido(s)`);
      }
      setResultadoExclusao(linhas.join(" · "));
      setConfirmacaoTexto("");
    } catch (e) {
      setResultadoExclusao(`Erro: ${e}`);
    } finally {
      setExcluindo(false);
    }
  };

  const handleSalvarPerfil = async () => {
    if (!auth.currentUser) return;
    setSalvando(true);
    setMensagem(null);

    try {
      await updateProfile(auth.currentUser, { displayName: nome.trim() || null });
      // Sincroniza o nome também no Firestore (permissões do usuário)
      await atualizarNome(auth.currentUser.uid, nome.trim());
      setMensagem({ tipo: "sucesso", texto: "Perfil atualizado com sucesso!" });
    } catch {
      setMensagem({ tipo: "erro", texto: "Erro ao atualizar perfil. Tente novamente." });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <DashboardLayout titulo="Configurações">
      <div className="max-w-xl space-y-6">
        {/* Perfil */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
              <FiUser size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Meu Perfil</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Informações da sua conta</p>
            </div>
          </div>

          {/* Email (somente leitura) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FiMail size={14} />
              E-mail
            </label>
            <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 select-all">
              {user?.email ?? "—"}
            </div>
          </div>

          {/* Nome de exibição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome de exibição</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Feedback */}
          {mensagem && (
            <p className={`text-sm px-4 py-2.5 rounded-xl ${
              mensagem.tipo === "sucesso"
                ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-500"
            }`}>
              {mensagem.texto}
            </p>
          )}

          <button
            onClick={handleSalvarPerfil}
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FiSave size={15} />
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>

        {/* Zona de perigo — Excluir tudo */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500">
              <FiTrash2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-red-600 dark:text-red-400">Zona de Perigo</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Ações irreversíveis — prossiga com cautela</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 space-y-2">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Excluir todos os dados</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Remove permanentemente todos os registros de clientes, produtos, tarefas, financeiro e documentos vinculados à sua conta. Esta ação <strong>não pode ser desfeita</strong>.
            </p>
            <button
              onClick={() => { setMostrarModalExcluir(true); setResultadoExclusao(null); setConfirmacaoTexto(""); }}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <FiTrash2 size={14} />
              Excluir tudo
            </button>
          </div>
        </div>

        {/* Modal de confirmação */}
        {mostrarModalExcluir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
              <div className="flex items-center gap-3 text-red-500">
                <FiAlertTriangle size={24} />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Confirmação de exclusão</h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Para confirmar, digite <strong className="text-red-500">EXCLUIR TUDO</strong> no campo abaixo:
              </p>

              <input
                value={confirmacaoTexto}
                onChange={(e) => setConfirmacaoTexto(e.target.value)}
                placeholder="Digite EXCLUIR TUDO"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
              />

              {resultadoExclusao && (
                <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                  ✓ {resultadoExclusao}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalExcluir(false)}
                  disabled={excluindo}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirTudo}
                  disabled={confirmacaoTexto !== "EXCLUIR TUDO" || excluindo}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {excluindo ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Informações do sistema */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Sistema</h2>
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Versão</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>Plataforma</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Elephens Dashboard</span>
            </div>
            <div className="flex justify-between">
              <span>UID do usuário</span>
              <span className="font-mono text-xs text-gray-400 dark:text-gray-500 truncate max-w-45">{user?.uid ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

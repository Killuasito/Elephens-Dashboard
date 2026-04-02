// Barra superior do dashboard
// Exibe o título da página atual (derivado do pathname) e o avatar/nome do usuário logado

"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/layout/ThemeProvider";
import { usePermissoes } from "@/hooks/usePermissoes";
import { FiUser, FiSun, FiMoon, FiMenu } from "react-icons/fi";

const TITULOS: Record<string, string> = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  produtos: "Produtos",
  tarefas: "Tarefas",
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  admin: "Gerenciar Usuários",
  chatbot: "ChatBot IA",
  documentos: "Documentos",
  importacao: "Importação",
};

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { tema, alternarTema } = useTheme();
  const { nomeUsuario } = usePermissoes();

  const segmento = pathname.split("/")[1] ?? "";
  const titulo = TITULOS[segmento] ?? segmento;

  const nomeExibido = nomeUsuario || user?.displayName || user?.email?.split("@")[0] || "Usuário";

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      {/* Botão hambúrguer embutido na Navbar em mobile */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="lg:hidden p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <FiMenu size={20} />
          </button>
        )}
        {/* Título da página atual */}
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
          {titulo}
        </h1>
      </div>

      {/* Informações do usuário logado */}
      <div className="flex items-center gap-3">
        {/* Botão de alternar tema */}
        <button
          onClick={alternarTema}
          aria-label="Alternar tema"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {tema === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>

        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
          {nomeExibido}
        </span>

        {/* Avatar com inicial do nome ou ícone padrão */}
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm">
          {nomeExibido !== "Usuário" ? (
            nomeExibido[0].toUpperCase()
          ) : (
            <FiUser size={16} />
          )}
        </div>
      </div>
    </header>
  );
}
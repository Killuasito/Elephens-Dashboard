"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiGrid,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiPackage,
  FiCheckSquare,
  FiTrendingUp,
  FiShield,
  FiMessageSquare,
  FiFolder,
  FiUploadCloud,
} from "react-icons/fi";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { usePermissoes } from "@/hooks/usePermissoes";
import type { ModuloId } from "@/lib/modulos";
import { FiUser } from "react-icons/fi";

// Links fixos — sempre visíveis independente de permissões
const NAV_FIXOS = [
  { href: "/dashboard", label: "Dashboard", icone: FiGrid },
];

// Links condicionados às permissões do usuário
const NAV_MODULOS: { href: string; label: string; icone: React.ElementType; modulo: ModuloId }[] = [
  { href: "/clientes",   label: "Clientes/Fornecedores",    icone: FiUsers,       modulo: "clientes" },
  { href: "/produtos",   label: "Produtos",    icone: FiPackage,     modulo: "produtos" },
  { href: "/tarefas",    label: "Tarefas",     icone: FiCheckSquare, modulo: "tarefas" },
  { href: "/financeiro", label: "Financeiro",  icone: FiTrendingUp,  modulo: "financeiro" },
  { href: "/relatorios", label: "Relatórios",  icone: FiBarChart2,   modulo: "relatorios" },
  { href: "/chatbot",    label: "ChatBot IA",  icone: FiMessageSquare, modulo: "chatbot" },
  { href: "/documentos",  label: "Documentos",  icone: FiFolder,        modulo: "documentos" },
  { href: "/importacao",  label: "Importação",   icone: FiUploadCloud,   modulo: "importacao" },
];

// Links fixos no rodapé da nav
const NAV_RODAPE = [
  { href: "/configuracoes", label: "Configurações", icone: FiSettings },
];

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut, loading: authLoading } = useAuth();
  const { temAcesso, nomeUsuario, nomeApp, loading: loadingPermissoes } = usePermissoes();
  const [aberta, setAberta] = useState(false);

  const ehAdmin = user?.email === ADMIN_EMAIL;
  // Suprime módulos até auth + permissões resolverem — evita flash de itens incorretos
  const isLoading = authLoading || loadingPermissoes;

  const renderLink = ({ href, label, icone: Icone }: { href: string; label: string; icone: React.ElementType }) => {
    const ativo = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setAberta(false)}
        className={clsx(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
          ativo
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
        )}
      >
        <Icone size={18} />
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Botão hambúrguer — visível apenas em mobile */}
      <button
        onClick={() => setAberta(!aberta)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-white dark:bg-gray-900 shadow-md lg:hidden"
        aria-label="Alternar menu"
      >
        {aberta ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Overlay escuro em mobile quando sidebar aberta */}
      {aberta && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setAberta(false)}
        />
      )}

      {/* Sidebar principal */}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
          "flex flex-col z-40 transition-transform duration-300",
          // Em mobile: slide conforme estado; em desktop: sempre visível
          aberta ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo + info do usuário */}
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
            {nomeApp || "🐘 | Elephens"}
          </span>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-sm shrink-0">
              {nomeUsuario ? nomeUsuario[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : <FiUser size={14} />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                {nomeUsuario || user?.displayName || "Sem nome"}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {user?.email ?? ""}
              </p>
            </div>
          </div>
        </div>

        {/* Links de navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Links fixos — sempre visíveis */}
          {NAV_FIXOS.map(renderLink)}

          {/* Módulos — skeleton enquanto auth/permissões carregam */}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))
          ) : (
            NAV_MODULOS
              .filter(({ modulo }) => ehAdmin || temAcesso(modulo))
              .map(renderLink)
          )}

          {/* Rodapé fixo + link admin */}
          {NAV_RODAPE.map(renderLink)}
          {!isLoading && ehAdmin && renderLink({ href: "/admin", label: "Gerenciar Usuários", icone: FiShield })}
        </nav>

        {/* Botão de logout no rodapé */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <FiLogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
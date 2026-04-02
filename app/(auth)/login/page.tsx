// Página de login — layout split-screen profissional
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FiMail, FiLock, FiArrowRight, FiCheck } from "react-icons/fi";

const FEATURES = [
  "Gestão completa de clientes e fornecedores",
  "Controle de estoque e produtos em tempo real",
  "Financeiro com receitas, despesas e saldo",
  "Relatórios e gráficos interativos",
  "ChatBot com IA integrada",
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await signIn(email, senha);
      router.push("/dashboard");
    } catch {
      setErro("E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Branding — desktop: coluna esquerda | mobile: topo ──────── */}
      <div className="lg:w-1/2 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 flex flex-col justify-between relative overflow-hidden
                      /* mobile */ px-6 pt-14 pb-10 lg:p-12">

        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-72 h-72 lg:w-96 lg:h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-24 -right-12 w-64 h-64 lg:w-80 lg:h-80 bg-blue-900/40 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 lg:w-64 lg:h-64 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="relative z-10">
          <span className="text-3xl font-bold text-white tracking-tight">🐘 Elephens</span>
          <p className="text-blue-200 text-sm mt-1">Plataforma de gestão empresarial</p>
        </div>

        {/* Pitch central — condensado no mobile, expandido no desktop */}
        <div className="relative z-10 mt-8 lg:mt-0 space-y-6 lg:space-y-8">
          <div className="space-y-2 lg:space-y-3">
            <h2 className="text-2xl lg:text-4xl font-bold text-white leading-tight">
              Gerencie seu negócio com inteligência
            </h2>
            <p className="text-blue-100 text-sm lg:text-base leading-relaxed max-w-sm hidden sm:block">
              Tudo que você precisa em um só lugar: clientes, produtos, finanças e muito mais.
            </p>
          </div>

          {/* Feature carousel — auto-scroll left (items move right to left) on mobile */}
          <div
            className="lg:hidden overflow-hidden py-1"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
            }}
          >
            <div className="marquee-track">
              {[...FEATURES, ...FEATURES].map((f, i) => (
                <span
                  key={i}
                  className="shrink-0 flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap"
                >
                  <FiCheck size={10} />
                  {f}
                </span>
              ))}
            </div>
          </div>

          <ul className="hidden lg:flex flex-col space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <FiCheck size={11} className="text-white" />
                </span>
                <span className="text-blue-100 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rodapé — visível somente no desktop */}
        <p className="relative z-10 text-blue-300 text-xs hidden lg:block">
          © {new Date().getFullYear()} Elephens. Todos os direitos reservados.
        </p>
      </div>

      {/* ── Formulário — desktop: coluna direita | mobile: card inferior ── */}
      <div className="flex-1 flex items-center justify-center relative
                      /* mobile */ bg-gray-50 dark:bg-gray-950 rounded-t-3xl -mt-6 lg:mt-0 lg:rounded-none
                      /* mobile shadow */ shadow-[0_-4px_30px_rgba(0,0,0,0.12)] lg:shadow-none
                      px-6 pt-8 pb-10 lg:p-10">

        {/* Drag handle — mobile only */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 lg:hidden" />

        <div className="w-full max-w-sm space-y-7">

          {/* Título do form */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bem-vindo de volta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Entre com suas credenciais para acessar</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
              <div className="relative">
                <FiMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
              <div className="relative">
                <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={carregando || loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-blue-500/30 dark:shadow-blue-900/40"
            >
              {carregando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} Elephens. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
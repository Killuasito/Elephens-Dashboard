// Middleware de proteção de rotas
// Redireciona para /login caso o usuário não esteja autenticado
// Funciona com o token de sessão do Firebase armazenado em cookie

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rotas que exigem autenticação
const ROTAS_PROTEGIDAS = ["/dashboard", "/clientes", "/produtos", "/tarefas", "/financeiro", "/relatorios", "/configuracoes", "/admin", "/chatbot", "/documentos", "/importacao"];

// Rotas públicas (não redirecionam)
const ROTAS_PUBLICAS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se a rota atual exige autenticação
  const rotaProtegida = ROTAS_PROTEGIDAS.some((rota) =>
    pathname.startsWith(rota)
  );

  // Cookie de sessão gerado pelo Firebase (ou equivalente customizado)
  const token = request.cookies.get("firebase-auth-token")?.value;

  // Redireciona para login se não autenticado em rota protegida
  if (rotaProtegida && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redireciona para dashboard se já autenticado tentando acessar login
  if (ROTAS_PUBLICAS.includes(pathname) && token) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica o middleware apenas nas rotas relevantes
  matcher: ["/dashboard/:path*", "/clientes/:path*", "/produtos/:path*", "/tarefas/:path*", "/financeiro/:path*", "/relatorios/:path*", "/configuracoes/:path*", "/admin/:path*", "/login"],
};
// API Route — Gerenciamento de usuários (admin only)
// POST   → cria usuário no Firebase Auth + doc permissoes
// DELETE → exclui usuário do Firebase Auth + doc permissoes
// Protegida: verifica token do cookie e confirma que é o admin

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { MODULOS_PADRAO } from "@/lib/modulos";
import { PLANO_PADRAO } from "@/lib/planos";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

async function verificarAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("firebase-auth-token")?.value;
  if (!token) return false;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

// ─── POST — Criar novo usuário ────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!(await verificarAdmin(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { email, senha, nome } = body as { email: string; senha: string; nome?: string };

  if (!email?.trim() || !senha?.trim()) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres." }, { status: 400 });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email: email.trim(),
      password: senha,
      displayName: nome?.trim() || undefined,
    });

    await adminDb.doc(`permissoes/${userRecord.uid}`).set({
      uid: userRecord.uid,
      email: userRecord.email,
      nome: nome?.trim() ?? "",
      modulos: MODULOS_PADRAO,
      plano: PLANO_PADRAO,
      criadoEm: new Date().toISOString(),
    });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao criar usuário.";
    // Traduz erros comuns do Firebase
    if (msg.includes("email-already-exists")) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE — Excluir usuário ─────────────────────────────────────
export async function DELETE(request: NextRequest) {
  if (!(await verificarAdmin(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { uid } = body as { uid: string };

  if (!uid?.trim()) {
    return NextResponse.json({ error: "UID é obrigatório." }, { status: 400 });
  }

  try {
    // Remove conta do Firebase Auth
    await adminAuth.deleteUser(uid);
    // Remove doc de permissões
    await adminDb.doc(`permissoes/${uid}`).delete();

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao excluir usuário.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

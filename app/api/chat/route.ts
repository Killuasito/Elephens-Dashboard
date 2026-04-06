// API Route — Proxy seguro para OpenRouter com limite de uso por plano
// A chave OPENROUTER_API_KEY nunca é exposta ao cliente

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { PLANOS, PLANO_PADRAO, PlanoId } from "@/lib/planos";

export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { erro: "OPENROUTER_API_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  // Verificar autenticação via cookie
  const token = req.cookies.get("firebase-auth-token")?.value;
  if (!token) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ erro: "Token inválido." }, { status: 401 });
  }

  // Admin não tem restrição de uso
  const isAdmin = email === ADMIN_EMAIL;

  if (!isAdmin) {
    const mesAtual = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const ref = adminDb.doc(`permissoes/${uid}`);
    const snap = await ref.get();
    const data = snap.exists ? snap.data()! : {};
    const plano: PlanoId = (data.plano as PlanoId) ?? PLANO_PADRAO;
    const limite = PLANOS[plano].limite;

    if (isFinite(limite)) {
      const usage = data.chatUsage as { count: number; mes: string } | undefined;
      const count = usage?.mes === mesAtual ? (usage.count ?? 0) : 0;

      if (count >= limite) {
        return NextResponse.json(
          {
            erro: `Limite do plano ${PLANOS[plano].label} atingido (${limite} mensagens/mês). Fale com o administrador para fazer upgrade.`,
          },
          { status: 429 }
        );
      }

      // Incrementa o contador antes de processar
      await ref.update({ chatUsage: { count: count + 1, mes: mesAtual } });
    }
  }

  const { messages, contexto } = await req.json();

  const systemPrompt = `Você é um assistente financeiro e de gestão integrado ao Elephens Dashboard. Responda sempre em português brasileiro de forma clara, objetiva e acionável. Use bullet points quando listar itens. Formate valores monetários como R$ X.XXX,XX. Seja direto — o usuário está visualizando dados em tempo real.

Dados atuais do sistema (atualizados agora):
${contexto}`;

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://elephens.vercel.app",
      "X-Title": "Elephens Dashboard",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return NextResponse.json({ erro: err }, { status: upstream.status });
  }

  // Repassa o stream SSE diretamente ao cliente
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

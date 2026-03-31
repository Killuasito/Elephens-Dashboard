// API Route — Proxy seguro para OpenRouter
// A chave OPENROUTER_API_KEY nunca é exposta ao cliente

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { erro: "OPENROUTER_API_KEY não configurada no servidor." },
      { status: 500 }
    );
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

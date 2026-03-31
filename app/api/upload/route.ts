// API Route — Upload e deleção de arquivos locais (public/uploads/documentos/)
// Funciona apenas em ambiente local/Node.js — não persiste em produção serverless

import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "documentos");
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// ── POST — recebe o arquivo e salva em disco ──────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ erro: "Apenas arquivos PDF são aceitos." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ erro: "Arquivo excede o limite de 20 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Garante que o diretório existe
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Nome único para evitar colisões
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}_${safeName}`;
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({
      url: `/uploads/documentos/${filename}`,
      filename,
    });
  } catch (err) {
    console.error("[upload] Erro:", err);
    return NextResponse.json({ erro: "Erro interno no servidor." }, { status: 500 });
  }
}

// ── DELETE — remove o arquivo do disco ───────────────────────────
export async function DELETE(req: NextRequest) {
  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ erro: "Nome de arquivo inválido." }, { status: 400 });
  }

  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // Arquivo pode já não existir — ignora
  }

  return NextResponse.json({ ok: true });
}

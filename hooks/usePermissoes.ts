"use client";

import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { MODULOS_PADRAO, ModuloId } from "@/lib/modulos";
import { Permissao } from "@/types";

// ─── usePermissoes ────────────────────────────────────────────────
// Lê as permissões do usuário atual em tempo real.
// Se for o primeiro acesso, cria o documento com todos os módulos habilitados.

export function usePermissoes() {
  const { user } = useAuth();
  const [modulos, setModulos] = useState<Record<ModuloId, boolean>>(MODULOS_PADRAO);
  const [nomeUsuario, setNomeUsuario] = useState<string>("");
  const [nomeApp, setNomeApp] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Usa um microtask para evitar setState síncrono dentro do efeito
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const ref = doc(db, "permissoes", user.uid);

    // Cria documento padrão no primeiro acesso
    getDoc(ref).then((snap) => {
      if (!snap.exists()) {
        setDoc(ref, {
          uid: user.uid,
          email: user.email,
          modulos: MODULOS_PADRAO,
          criadoEm: new Date().toISOString(),
        });
      }
    });

    // Escuta mudanças em tempo real (admin pode alterar a qualquer momento)
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Permissao;
        // Garante que novos módulos adicionados futuramente tenham true por padrão
        setModulos({ ...MODULOS_PADRAO, ...data.modulos });
        setNomeUsuario(data.nome ?? "");
        setNomeApp(data.nomeApp ?? "");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const temAcesso = (modulo: ModuloId): boolean => modulos[modulo] ?? false;

  return { modulos, nomeUsuario, nomeApp, loading, temAcesso };
}

// ─── useTodasPermissoes ───────────────────────────────────────────
// Exclusivo para o admin — lista permissões de todos os usuários.

export function useTodasPermissoes() {
  const [usuarios, setUsuarios] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "permissoes");
    const unsubscribe = onSnapshot(ref, (snap) => {
      setUsuarios(snap.docs.map((d) => d.data() as Permissao));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { usuarios, loading };
}

// ─── atualizarPermissao ───────────────────────────────────────────
// Habilita ou desabilita um módulo para um usuário específico.

export async function atualizarPermissao(
  uid: string,
  modulo: ModuloId,
  valor: boolean
) {
  const ref = doc(db, "permissoes", uid);
  await updateDoc(ref, { [`modulos.${modulo}`]: valor });
}

// ─── atualizarNome ────────────────────────────────────────────────
// Define o nome de exibição de um usuário (admin ou o próprio usuário).

export async function atualizarNome(uid: string, nome: string) {
  const ref = doc(db, "permissoes", uid);
  await updateDoc(ref, { nome: nome.trim() });
}

// ─── atualizarNomeApp ────────────────────────────────────────────
// Define o nome do software exibido na Sidebar do usuário.

export async function atualizarNomeApp(uid: string, nomeApp: string) {
  const ref = doc(db, "permissoes", uid);
  await updateDoc(ref, { nomeApp: nomeApp.trim() });
}

// Hook para operações CRUD no Firestore com suporte a tempo real
// Reutilizável em qualquer módulo do sistema (clientes, produtos, etc.)

"use client";

import { useState, useEffect } from "react";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Documento } from "@/types";

// ─── useCollection ───────────────────────────────────────────────
// Escuta uma coleção inteira em tempo real com onSnapshot

export function useCollection<T extends Documento>(colecao: string) {
  const [dados, setDados] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aguarda Firebase Auth restaurar a sessão antes de consultar
    const uid = auth.currentUser?.uid;
    if (!uid) {
      // onAuthStateChanged ainda não disparou — escuta uma vez e re-dispara
      const unsubAuth = auth.onAuthStateChanged((u) => {
        if (!u) {
          setDados([]);
          setLoading(false);
        }
        // Quando u existir, o useEffect será re-executado via dependência abaixo
      });
      return () => unsubAuth();
    }

    // Filtra documentos pelo uid do usuário atual
    const q = query(
      collection(db, colecao),
      where("uid", "==", uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const itens = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as T[];
        setDados(itens);
        setLoading(false);
      },
      (err) => {
        console.error(`Erro ao escutar coleção "${colecao}":`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colecao, auth.currentUser?.uid]);

  return { dados, loading, error };
}

// ─── useDocument ─────────────────────────────────────────────────
// Escuta um documento único em tempo real

export function useDocument<T extends Documento>(
  colecao: string,
  id: string
) {
  const [dado, setDado] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, colecao, id);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          setDado({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setDado(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Erro ao escutar documento "${id}" em "${colecao}":`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [colecao, id]);

  return { dado, loading, error };
}

// ─── addDocument ─────────────────────────────────────────────────
// Adiciona um novo documento à coleção com timestamp automático

export async function addDocument(
  colecao: string,
  dados: DocumentData
): Promise<{ id: string } | { error: string }> {
  try {
    const uid = auth.currentUser?.uid;
    const ref = await addDoc(collection(db, colecao), {
      ...dados,
      uid,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    return { id: ref.id };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`Erro ao adicionar em "${colecao}":`, mensagem);
    return { error: mensagem };
  }
}

// ─── updateDocument ───────────────────────────────────────────────
// Atualiza campos de um documento existente

export async function updateDocument(
  colecao: string,
  id: string,
  dados: DocumentData
): Promise<{ sucesso: boolean } | { error: string }> {
  try {
    const ref = doc(db, colecao, id);
    await updateDoc(ref, {
      ...dados,
      atualizadoEm: serverTimestamp(),
    });
    return { sucesso: true };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`Erro ao atualizar documento "${id}" em "${colecao}":`, mensagem);
    return { error: mensagem };
  }
}

// ─── deleteDocument ───────────────────────────────────────────────
// Remove um documento da coleção

export async function deleteDocument(
  colecao: string,
  id: string
): Promise<{ sucesso: boolean } | { error: string }> {
  try {
    const ref = doc(db, colecao, id);
    await deleteDoc(ref);
    return { sucesso: true };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`Erro ao deletar documento "${id}" em "${colecao}":`, mensagem);
    return { error: mensagem };
  }
}
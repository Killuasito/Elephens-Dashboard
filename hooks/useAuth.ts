// Hook de autenticação — gerencia estado do usuário com Firebase Auth
// Retorna user, loading, signIn e signOut para uso em qualquer componente

"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { AuthHookReturn } from "@/types";

export function useAuth(): AuthHookReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Escuta mudanças no estado de autenticação em tempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuarioAtual) => {
      setUser(usuarioAtual);
      if (usuarioAtual) {
        // Mantém o cookie sincronizado para o middleware conseguir proteger as rotas
        const token = await usuarioAtual.getIdToken();
        document.cookie = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Strict`;
      } else {
        document.cookie = "firebase-auth-token=; path=/; max-age=0";
      }
      setLoading(false);
    });

    // Cancela a escuta ao desmontar o componente
    return () => unsubscribe();
  }, []);

  // Realiza login com e-mail e senha
  const signIn = async (email: string, senha: string): Promise<void> => {
    setLoading(true);
    try {
      const resultado = await signInWithEmailAndPassword(auth, email, senha);
      // Define o cookie antes do redirect para o middleware não barrar a navegação
      const token = await resultado.user.getIdToken();
      document.cookie = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Strict`;
    } finally {
      setLoading(false);
    }
  };

  // Realiza logout do usuário atual — redireciona imediatamente sem esperar o Firebase
  const signOut = async (): Promise<void> => {
    // Apaga cookie e redireciona antes do Firebase confirmar — UX instantânea
    document.cookie = "firebase-auth-token=; path=/; max-age=0";
    setUser(null);
    router.push("/login");
    // Dispara logout no Firebase em background
    firebaseSignOut(auth).catch(() => {});
  };

  return { user, loading, signIn, signOut };
}
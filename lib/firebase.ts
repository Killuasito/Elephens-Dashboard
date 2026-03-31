// Configuração e inicialização do Firebase
// Este arquivo exporta as instâncias de autenticação e banco de dados

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração lida das variáveis de ambiente (.env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Evita inicializar múltiplas vezes em desenvolvimento (hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Instância de autenticação
export const auth = getAuth(app);

// Instância do Firestore (banco de dados)
export const db = getFirestore(app);

export default app;
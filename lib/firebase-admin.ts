// Firebase Admin SDK — usado apenas em API Routes (server-side)
// Requer as variáveis de ambiente FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY
// Obtenha em: Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // A chave privada vem com \n literais no .env — precisa converter
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

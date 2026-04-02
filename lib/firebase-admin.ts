// Firebase Admin SDK — usado apenas em API Routes (server-side)
// Requer as variáveis de ambiente FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY
// Obtenha em: Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let _app: App | undefined;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) return (_app = getApps()[0]);
  return (_app = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // A chave privada vem com \n literais no .env — precisa converter
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  }));
}

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get: (_, prop) => (getAuth(getAdminApp()) as never)[prop as never],
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get: (_, prop) => (getFirestore(getAdminApp()) as never)[prop as never],
});

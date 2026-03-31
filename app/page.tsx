// Página raiz — redireciona automaticamente para o dashboard

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
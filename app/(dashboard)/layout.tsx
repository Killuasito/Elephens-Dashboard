"use client";

// Shell persistente do dashboard — monta UMA vez e fica estável entre navegações.
// Colocar Sidebar/Navbar/hooks aqui evita que remontem a cada troca de página.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { usePermissoes } from "@/hooks/usePermissoes";
import { MODULOS_IDS } from "@/lib/modulos";
import type { ModuloId } from "@/lib/modulos";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { modulos, loading } = usePermissoes();
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const segmento = pathname.split("/")[1] as ModuloId;
  const ehModulo = (MODULOS_IDS as readonly string[]).includes(segmento);
  const ehAdmin = user?.email === ADMIN_EMAIL;

  // Fecha a sidebar automaticamente ao trocar de página em mobile
  useEffect(() => {
    setSidebarAberta(false);
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (ehAdmin) return;
    if (ehModulo && !modulos[segmento]) {
      router.replace("/dashboard");
    }
  }, [loading, ehModulo, ehAdmin, segmento, modulos, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      <Sidebar aberta={sidebarAberta} setAberta={setSidebarAberta} />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <Navbar onMenuClick={() => setSidebarAberta((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
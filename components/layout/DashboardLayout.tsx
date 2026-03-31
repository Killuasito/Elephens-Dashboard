// DashboardLayout — passthrough transparente.
// O shell (Sidebar, Navbar, guards de permissão) agora vive em
// app/(dashboard)/layout.tsx e fica persistente entre navegações.
// Este wrapper é mantido apenas para compatibilidade com os page.tsx existentes.

interface DashboardLayoutProps {
  children: React.ReactNode;
  titulo?: string; // mantido para não quebrar os imports existentes
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <>{children}</>;
}
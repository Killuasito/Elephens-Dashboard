import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  output: 'export', // Essencial para o Capacitor
  images: {
    unoptimized: true, // O componente <Image> do Next precisa disso para exportação estática
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Opções de configuração existentes preservadas */

  // 🔵 ESSENCIAL: Permite que o Next.js utilize e compile o código do "Cérebro" (@jairo/core)
  // Esta linha garante que a Web consiga ler a lógica compartilhada.
  transpilePackages: ["@jairo/core"],

  // Removida a chave 'experimental.turbo' que causou o erro de 'Unrecognized key'.
  // O Next.js 16 tratará a raiz automaticamente assim que os lockfiles forem limpos.
};

export default nextConfig;
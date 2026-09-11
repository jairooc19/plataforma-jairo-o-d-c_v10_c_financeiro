import AuthInterface from "@/components/AuthInterface";

/**
 * 🏁 PÁGINA: COMPLETAR CADASTRO (PJODC v10)
 * Local: apps/admin-web/src/app/auth/complete-profile/page.tsx
 *
 * Existe para dar um ENDEREÇO à tela de completar cadastro. No fluxo do popup o
 * usuário nunca passa por aqui — o `useAuthLogic` troca a view sem navegar. Esta
 * página serve a quem chega ao dashboard com o perfil pela metade: pelo caminho
 * de reserva (redirecionamento do Google, que aterrissa direto em /dashboard) ou
 * abrindo /dashboard num acesso posterior. O dashboard manda para cá.
 *
 * Sem endereço próprio, esses casos não teriam para onde ser enviados.
 */
export default function CompleteProfilePage() {
  return <AuthInterface initialView="complete-profile" />;
}

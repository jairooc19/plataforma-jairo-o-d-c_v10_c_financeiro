import { useState } from 'react';
import { useRouter } from 'expo-router';
import { COUNTRIES, BRAZIL_STATES } from '@jairo/core';
import { useAuthForm } from './useAuthForm';
import { useTenantTriage, type PapelTriagem } from './useTenantTriage';
import { useBrazilCitiesMobile } from './useBrazilCitiesMobile';
import type { PapelDeAcesso } from '@/services/papelDeAcessoService';
import { useSignUpFlow } from './auth/useSignUpFlow';
import { usePasswordLogin } from './auth/usePasswordLogin';
import { useGoogleLogin } from './auth/useGoogleLogin';
import { useProfileCompletion } from './auth/useProfileCompletion';
import { errorService } from '@/services/errorService';
import type { FluxoAuthCtx, ViewState, AuthMessage } from './auth/types';

export type { ViewState, AuthMessage } from './auth/types';

/**
 * 🛰️ CÉREBRO DA GUARITA MOBILE — ORQUESTRADOR (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useAuthLogicMobile.ts
 *
 * Espelho do `useAuthLogic` da web (398 linhas), aqui dividido por
 * responsabilidade conforme a regra de ouro do CLAUDE.md. Este arquivo é o
 * índice: guarda os estados compartilhados e delega cada fluxo ao seu dono.
 *
 *   hooks/useAuthForm.ts            → o que o usuário digitou
 *   hooks/useTenantTriage.ts        → para onde ir depois de autenticado
 *   hooks/auth/useSignUpFlow.ts     → cadastro por senha
 *   hooks/auth/usePasswordLogin.ts  → Dependente e Desenvolvedor
 *   hooks/auth/useGoogleLogin.ts    → Proprietário
 *   hooks/auth/useProfileCompletion.ts → completar cadastro e sair
 *
 * ⚠️ NENHUMA REGRA DE NEGÓCIO MORA AQUI nem nos quatro fluxos. Validação de
 * perfil, tradução de erro do Google, criação de perfil e consulta de vínculos
 * vêm todas do `@jairo/core` — estes arquivos orquestram estado de tela.
 *
 * ===========================================================================
 * 🎫 O PAPEL É UM PARÂMETRO, E NUNCA UMA DEDUÇÃO A PARTIR DA `view`
 * ===========================================================================
 * Seria tentador escrever `view === 'login-dependent' ? 'DEPENDENT' : 'OWNER'`
 * e poupar um parâmetro. **O CLAUDE.md proíbe explicitamente**, e o motivo é
 * este fluxo: o "Completar Cadastro" fica no MEIO do caminho, em outra rota,
 * com `view === 'complete-profile'` — e é justamente ali que a triagem do
 * primeiro acesso acontece. A dedução leria "não é login-dependent" e chamaria
 * todo Dependente novo de Proprietário.
 *
 * Quem passa o papel é a ROTA de login, a partir do `?papel=` que a guarita
 * escreveu no clique. E para o que atravessa o OAuth (que sai do aplicativo e
 * pode voltar com ele morto) quem responde é o cofre —
 * `services/papelDeAcessoService.ts`.
 *
 * ⚠️ O PADRÃO `'OWNER'` SERVE ÀS ROTAS QUE NÃO ESCOLHEM PAPEL (cadastro,
 * completar perfil). Nenhuma delas usa este valor para triar: o
 * `useProfileCompletion` lê o cofre, porque o dele veio de antes.
 */
export function useAuthLogicMobile(
  initialView: ViewState = 'menu',
  papel: PapelDeAcesso = 'OWNER'
) {
  const router = useRouter();
  const { triar } = useTenantTriage();
  const {
    formData,
    handleInputChange,
    preencherDoPerfil,
    resetForm,
    errors,
    podeEnviarLogin,
    podeEnviarCadastro,
    podeEnviarPerfil,
  } = useAuthForm();

  const [view, setView] = useState<ViewState>(initialView);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<AuthMessage | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  const countriesOptions = COUNTRIES;
  const statesOptions = BRAZIL_STATES;
  const { cities: citiesOptions, loading: citiesLoading } = useBrazilCitiesMobile(
    formData.country,
    formData.state
  );

  /**
   * Mostra a falha já traduzida e registra o erro cru no console.
   *
   * ⚠️ PASSA O ERRO INTEIRO ao `errorService`, não só `erro.message`. Falha de
   * rede e negativa do RLS chegam com `code` (`42501`, `PGRST301`) e mensagem
   * genérica: extrair só o texto aqui jogaria fora justamente o sinal que
   * distingue "sem internet" de "sem permissão".
   */
  const falhar = (erro: unknown) => {
    errorService.registrar('AUTH', erro);
    setMessage({ text: '❌ ' + errorService.mensagem(erro), type: 'error' });
  };

  /**
   * Resposta a "nenhum vínculo", diferente por papel — igual à web.
   *
   * ⚠️ O DEPENDENTE RECEBIA UM ERRO VERMELHO AQUI ("Sem vínculos encontrados"),
   * e isso mudou em 20/09/2026. Era a resposta certa enquanto ele entrava por
   * SENHA: quem já tinha conta e não tinha equipe estava mesmo diante de um
   * problema. Pela porta do Google a frase vira mentira — a conta ACABOU de ser
   * criada, com sucesso, e não faltar equipe no primeiro acesso é o normal, não
   * a exceção. Um erro vermelho ali ensina a pessoa a achar que o login falhou e
   * a tentar de novo, para sempre.
   *
   * As duas salas são diferentes de propósito: ver a nota em `auth/types.ts`.
   */
  const tratarSemVinculos = (papelDaTriagem: PapelTriagem) => {
    setView(papelDaTriagem === 'OWNER' ? 'waiting-approval' : 'waiting-team');
  };

  const ctx: FluxoAuthCtx = {
    formData, setLoading, setMessage, setView, setCurrentUser,
    triar, falhar, tratarSemVinculos,
  };

  /**
   * 🔧 O DESENVOLVEDOR NÃO PASSA PELA VALIDAÇÃO DE FORMA, e isso não é folga:
   * a credencial dele é fixa no Core (`authService.developerSignIn`) e a senha
   * tem QUATRO caracteres. O `podeEnviarLogin` do `useAuthForm` exige seis —
   * o mínimo do GoTrue — então o botão "Entrar" do Painel de Engenharia nascia
   * desabilitado e continuava assim por mais que se digitasse: a senha certa
   * era reprovada por uma regra que não vale para ela, porque esse acesso nunca
   * chega ao GoTrue. A web nunca teve o problema — lá o botão só desabilita
   * durante o `loading`.
   *
   * Para o Desenvolvedor, portanto, o portão é só "os dois campos preenchidos".
   * Quem valida de verdade é o Core, comparando as duas strings.
   */
  const podeEnviarLoginEfetivo =
    view === 'login-developer'
      ? !!formData.email.trim() && !!formData.password
      : podeEnviarLogin;

  const { handleSignUp } = useSignUpFlow(ctx, resetForm);
  const { handleSignIn } = usePasswordLogin(ctx, view);
  const { handleGoogleSignIn } = useGoogleLogin(ctx, papel);
  const { carregarUsuarioPendente, handleCompleteProfile, handleLogout } =
    useProfileCompletion(ctx, currentUser, preencherDoPerfil, resetForm);

  const goHome = () => {
    setView('menu');
    setMessage(null);
    resetForm();
    router.replace('/(auth)');
  };

  return {
    view, setView, loading, message, setMessage, currentUser,
    formData, handleInputChange, countriesOptions, statesOptions,
    citiesOptions, citiesLoading,
    // Validação de forma, calculada no `useAuthForm`. As telas a exibem campo a
    // campo; a regra de verdade continua no banco e no Core.
    errors, podeEnviarLogin: podeEnviarLoginEfetivo, podeEnviarCadastro, podeEnviarPerfil,
    handleSignUp, handleSignIn, handleGoogleSignIn,
    handleCompleteProfile, carregarUsuarioPendente, handleLogout, goHome,
  };
}

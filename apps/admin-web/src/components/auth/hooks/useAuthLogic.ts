"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  authService,
  googleAuthService,
  profileService,
  telemetry,
  COUNTRIES,
  BRAZIL_STATES,
  ANALYTICS_EVENTS,
  ANALYTICS_PROPERTIES,
  type VinculoDeEmpresa,
} from "@jairo/core";
import type { CredentialResponse } from "@react-oauth/google";
import { loginWithCatracaAction } from "../../../app/auth/actions";
import { syncGoogleSessionAction } from "../../../app/auth/google-actions";
import { encerrarSessao } from "../../../lib/logout";
import { useBrazilCities } from "../../../hooks/useBrazilCities";
import { mensagemDeErro } from "../../../lib/erro";

/**
 * 🧠 CÉREBRO DA GUARITA — WEB (PJODC v10)
 * Local: apps/admin-web/src/components/auth/hooks/useAuthLogic.ts
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  1. O DESENVOLVEDOR ENTRA PELA PORTA NORMAL. Sumiu o `developerSignIn` (duas
 *     strings comparadas dentro do navegador) e sumiu a marca
 *     `sessionStorage.dev_vip_access`, que qualquer pessoa criava pelo console
 *     do navegador. Agora ele faz login de verdade e o BANCO responde se é
 *     superusuário (`is_superuser`).
 *  2. O CADASTRO NÃO PEDE MAIS `role`. O valor ia no metadata do `signUp`, que é
 *     escrito pelo navegador: dava para nascer `active` e pular a triagem. O
 *     gatilho do banco agora ignora esse campo.
 *  3. A NOTIFICAÇÃO DE NOVO CADASTRO SAIU. Ela chamava uma rota aberta que só
 *     escrevia no log do servidor. A fila de triagem já mostra quem chegou.
 *  4. O DESVIO DE PLANETA VOLTA PARA A TELA DE ONDE SAIU. Antes, escolher
 *     "OUTRO" no "Completar Cadastro" e clicar em "Voltar e Selecionar Terra"
 *     jogava o usuário no formulário de CADASTRO — outra tela, com outros
 *     campos. E "Enviar solicitação" não fazia nada: a pegadinha nunca ligava.
 *  5. TODO EVENTO DE TELEMETRIA VEM DE `ANALYTICS_EVENTS`. Não há mais string
 *     solta.
 */

export type ViewState =
  | 'menu' | 'access-options' | 'about' | 'contact'
  | 'login-owner' | 'login-dependent' | 'viewer-only'
  | 'signup' | 'planet-blocked' | 'login-developer'
  | 'select-tenant' | 'waiting-approval' | 'complete-profile';

/** Vínculo como a tela de seleção o consome. */
export type TenantLink = VinculoDeEmpresa;

export function useAuthLogic(initialView: ViewState) {
  const router = useRouter();

  // --- ESTADOS DE CONTROLE ---
  const [view, setView] = useState<ViewState>(initialView);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pegadinha, setPegadinha] = useState(false);
  const [showHelpOptions, setShowHelpOptions] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [userTenants, setUserTenants] = useState<TenantLink[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  /**
   * De qual tela o usuário veio quando caiu no bloqueio planetário.
   * Sem isto, "Voltar e Selecionar Terra" não tem como saber se devolve ao
   * cadastro ou ao "Completar Cadastro" — e a v9 devolvia sempre ao cadastro.
   */
  const [origemDoBloqueio, setOrigemDoBloqueio] = useState<ViewState>('signup');

  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    planet: 'TERRA', country: 'BRASIL', state: '', city: ''
  });

  // --- LISTAS DE LOCALIZAÇÃO ---
  // Países e estados vêm prontos do Core (lista estática, sem rede).
  // Só as cidades dependem de API — o IBGE, num hook compartilhado com a edição
  // de perfil do dashboard, para não existirem duas cópias da mesma busca.
  const countriesOptions = COUNTRIES;
  const statesOptions = BRAZIL_STATES;
  const citiesOptions = useBrazilCities(formData.country, formData.state);

  // --- QUEM CHEGA EM /auth/complete-profile PELA URL ---
  useEffect(() => {
    if (view !== 'complete-profile' || currentUser) return;

    const carregarUsuarioPendente = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      setCurrentUser({ id: user.id, email: user.email ?? '' });

      try {
        const perfil = await profileService.getProfile(user.id);
        setFormData(prev => ({
          ...prev,
          full_name: perfil.full_name || '',
          planet:    perfil.planet    || 'TERRA',
          country:   perfil.country   || 'BRASIL',
          state:     perfil.state     || '',
          city:      perfil.city      || '',
        }));
      } catch (erro) {
        console.error('[CompleteProfile] Perfil não pôde ser lido:', erro);
      }
    };

    carregarUsuarioPendente();
  }, [view, currentUser, router]);

  // --- HANDLERS ---
  const handleInputChange = (name: string, value: string) => {
    let finalValue = value;
    if (name === 'email') finalValue = value.toLowerCase();
    else if (['planet', 'country', 'state', 'city', 'full_name'].includes(name)) finalValue = value.toUpperCase();

    setFormData(prev => ({ ...prev, [name]: finalValue, ...(name === 'state' ? { city: '' } : {}) }));

    if (name === 'planet' && finalValue !== 'TERRA') {
      setPegadinha(false);
      setOrigemDoBloqueio(view === 'complete-profile' ? 'complete-profile' : 'signup');
      setView('planet-blocked');
    }
  };

  /**
   * 👽 Desfecho do bloqueio planetário.
   * `show-joke` liga a pegadinha (na v9 ela nunca ligava, e o botão "Enviar
   * solicitação" não fazia nada); `fix-planet` devolve TERRA e volta para a tela
   * de onde o usuário veio.
   */
  const handlePlanetAction = (acao: 'fix-planet' | 'show-joke') => {
    if (acao === 'show-joke') {
      setPegadinha(true);
      return;
    }
    setPegadinha(false);
    setFormData(prev => ({ ...prev, planet: 'TERRA' }));
    setView(origemDoBloqueio);
  };

  const goHome = () => {
    setView('menu');
    setMessage(null);
    setPegadinha(false);
    setShowPassword(false);
    setShowHelpOptions(false);
    setUserTenants([]);
    setFormData({
      full_name: '', email: '', password: '', confirm_password: '',
      planet: 'TERRA', country: 'BRASIL', state: '', city: ''
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (formData.password !== formData.confirm_password) {
      setMessage({ text: "❌ As senhas não coincidem!", type: "error" });
      setLoading(false); return;
    }

    if (!formData.country || !formData.country.trim()) {
      setMessage({ text: "❌ Informe o país. Este campo é obrigatório.", type: "error" });
      setLoading(false); return;
    }

    /**
     * ⚠️ SEM `role` NO METADATA (correção S9). O que vai aqui é escrito pelo
     * navegador e chega ao gatilho do banco; mandar `role: 'active'` fazia a
     * conta nascer aprovada. O gatilho da v10 ignora o campo, e a tela parou de
     * enviá-lo para não sugerir que ele vale alguma coisa.
     */
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.full_name,
          planet: formData.planet,
          country: formData.country.trim(),
          state: formData.state,
          city: formData.city,
        }
      }
    });

    if (error) setMessage({ text: "❌ Erro: " + error.message, type: "error" });
    else {
      setMessage({ text: "✅ Cadastro concluído! Você já pode entrar no sistema.", type: "success" });
      setTimeout(() => goHome(), 4000);
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const emailLower = formData.email.toLowerCase();
    const querPainelTecnico = view === 'login-developer';

    telemetry.capture(ANALYTICS_EVENTS.AUTH_ATTEMPT_SUBMIT, {
      [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower,
      [ANALYTICS_PROPERTIES.SELECTED_ROLE]: view
    });

    try {
      const response = await loginWithCatracaAction(emailLower, formData.password);
      if (!response.success) throw new Error(response.error);
      if (response.session) await supabase.auth.setSession(response.session);

      const user = response.user!;
      telemetry.identify(user.id, { [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email });

      /**
       * 🔧 PAINEL DE ENGENHARIA: quem decide é o banco.
       * `ehDesenvolvedor` vem da Server Action, que perguntou ao Postgres com a
       * sessão recém-criada. A tela não tem como "se autorizar".
       */
      if (response.ehDesenvolvedor) {
        telemetry.capture(ANALYTICS_EVENTS.AUTH_DEVELOPER_SUCCESS, {
          [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower
        });
        router.push("/dashboard");
        return;
      }

      if (querPainelTecnico) {
        // Entrou com uma credencial válida, mas esta conta não tem acesso
        // técnico. Encerramos a sessão: quem pediu a porta de serviço não deve
        // ficar logado como usuário comum sem perceber.
        telemetry.capture(ANALYTICS_EVENTS.AUTH_DEVELOPER_DENIED, {
          [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower
        });
        await encerrarSessao();
        setMessage({ text: "❌ Esta conta não tem acesso ao Painel de Engenharia.", type: "error" });
        setLoading(false);
        return;
      }

      const members = await authService.getUserTenants(user.id, 'DEPENDENT');

      if (!members || members.length === 0) {
        setMessage({ text: "❌ Sem vínculos encontrados.", type: "error" });
        setLoading(false); return;
      }

      if (members.length === 1) handleSelectTenant(members[0]);
      else { setUserTenants(members); setView('select-tenant'); }
    } catch (error: unknown) {
      setMessage({ text: "❌ Falha: " + mensagemDeErro(error), type: "error" });
    } finally { setLoading(false); }
  };

  /**
   * ✅ TRIAGEM PÓS-LOGIN DO PROPRIETÁRIO (Google)
   * Nenhum vínculo -> sala de espera; um -> entra; vários -> seletor.
   */
  const encaminharProprietario = async (userId: string) => {
    const members = await authService.getUserTenants(userId, 'OWNER');

    if (!members || members.length === 0) {
      setView('waiting-approval');
      return;
    }

    if (members.length === 1) handleSelectTenant(members[0]);
    else { setUserTenants(members); setView('select-tenant'); }
  };

  /**
   * 🔑 LOGIN GOOGLE DO PROPRIETÁRIO — CAMINHO PRINCIPAL (POPUP)
   */
  const handleGoogleSignIn = async (credentialResponse: CredentialResponse) => {
    setLoading(true);
    setMessage(null);

    try {
      const idToken = credentialResponse.credential;
      if (!idToken) throw new Error("O Google não devolveu nenhuma credencial.");

      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_ATTEMPT, {
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner'
      });

      const response = await authService.googleSignInOwner(idToken);
      if (!response.success || !response.user) throw new Error(response.error);

      // 🍪 A sessão do popup nasce só no navegador. Espelhamos nos cookies HTTP
      // para que o proxy e as Server Actions enxerguem o mesmo usuário.
      if (response.session) {
        await syncGoogleSessionAction(
          response.session.access_token,
          response.session.refresh_token
        );
      }

      telemetry.identify(response.user.id, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: response.user.email,
        [ANALYTICS_PROPERTIES.AUTH_PROVIDER]: 'google'
      });

      // 🏁 PORTÃO DO CADASTRO: o Google entrega e-mail e nome, nada mais.
      const cadastroCompleto = await profileService.isProfileCompleted(response.user.id);

      if (!cadastroCompleto) {
        setCurrentUser({ id: response.user.id, email: response.user.email ?? '' });
        setView('complete-profile');
        return;
      }

      await encaminharProprietario(response.user.id);
    } catch (error: unknown) {
      const mensagem = mensagemDeErro(error);
      setMessage({ text: "❌ Falha no Google OAuth: " + mensagem, type: "error" });
      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_FAILED, {
        [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: mensagem,
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner'
      });
    } finally {
      setLoading(false);
    }
  };

  /** ⚠️ O próprio botão do Google falhou (script bloqueado, popup fechado). */
  const handleGoogleError = () => {
    setMessage({ text: "❌ Falha na autenticação Google. Tente novamente.", type: "error" });
    telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_FAILED, {
      [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: 'google_button_error',
      [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner'
    });
  };

  /**
   * 🔁 CAMINHO DE RESERVA: sem NEXT_PUBLIC_GOOGLE_CLIENT_ID não há popup
   * possível, então o OAuth é conduzido pelo Supabase por redirecionamento.
   */
  const handleGoogleRedirect = async () => {
    setLoading(true);
    setMessage(null);

    try {
      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_ATTEMPT, {
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner_redirect'
      });

      await googleAuthService.signInWithGoogleRedirect(
        `${window.location.origin}/auth/google/callback`
      );
    } catch (error: unknown) {
      const mensagem = mensagemDeErro(error);
      setMessage({ text: "❌ Falha no Google OAuth: " + mensagem, type: "error" });
      telemetry.capture(ANALYTICS_EVENTS.AUTH_GOOGLE_FAILED, {
        [ANALYTICS_PROPERTIES.ERROR_MESSAGE]: mensagem,
        [ANALYTICS_PROPERTIES.AUTH_FLOW]: 'owner_redirect'
      });
      setLoading(false);
    }
  };

  /**
   * 🏁 GRAVA O CADASTRO COMPLETADO e segue para a triagem de empresas.
   * A validação dos cinco campos é do `profileService` (Core) — a tela só
   * desabilita o botão por cortesia; a regra não pode morar no navegador.
   */
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setMessage(null);

    try {
      await profileService.completeProfile(currentUser.id, {
        full_name: formData.full_name,
        planet: formData.planet,
        country: formData.country,
        state: formData.state,
        city: formData.city,
      });

      telemetry.capture(ANALYTICS_EVENTS.PROFILE_COMPLETED, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: currentUser.email,
        [ANALYTICS_PROPERTIES.AUTH_PROVIDER]: 'google'
      });

      await encaminharProprietario(currentUser.id);
    } catch (error: unknown) {
      setMessage({ text: "❌ " + mensagemDeErro(error), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🚪 Única saída da tela de completar cadastro.
   * Encerra as DUAS metades da sessão (navegador e cookies) e volta à guarita.
   */
  const handleLogout = async () => {
    setLoading(true);
    telemetry.reset();
    await encerrarSessao();
    setCurrentUser(null);
    goHome();
    setLoading(false);
    router.push('/');
  };

  const handleSelectTenant = (tenant: TenantLink) => {
    if (tenant.tenants.users?.is_active === false) {
      alert("⚠️ EMPRESA DESABILITADA.");
      return;
    }
    telemetry.group('tenant', tenant.tenant_id, { name: tenant.tenants.tenant_name });
    telemetry.capture(ANALYTICS_EVENTS.TENANT_SELECTED, {
      [ANALYTICS_PROPERTIES.TENANT_ID]: tenant.tenant_id,
      [ANALYTICS_PROPERTIES.USER_ROLE]: tenant.role,
    });
    sessionStorage.setItem('active_tenant_id', tenant.tenant_id);
    sessionStorage.setItem('user_role_context', tenant.role);
    router.push("/dashboard");
  };

  return {
    view, setView, loading, showPassword, setShowPassword, pegadinha, setPegadinha,
    showHelpOptions, setShowHelpOptions, message, setMessage,
    userTenants, formData, countriesOptions, statesOptions, citiesOptions,
    currentUser,
    handleInputChange, handlePlanetAction, goHome, handleSignUp, handleSignIn,
    handleSelectTenant, handleGoogleSignIn, handleGoogleError, handleGoogleRedirect,
    handleCompleteProfile, handleLogout
  };
}

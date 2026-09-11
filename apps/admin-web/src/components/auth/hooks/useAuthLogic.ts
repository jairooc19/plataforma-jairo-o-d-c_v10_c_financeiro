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
  ANALYTICS_PROPERTIES 
} from "@jairo/core";
import type { CredentialResponse } from "@react-oauth/google";
import { loginWithCatracaAction } from "../../../app/auth/actions";
import { syncGoogleSessionAction } from "../../../app/auth/google-actions";
import { encerrarSessao } from "../../../lib/logout";
import { useBrazilCities } from "../../../hooks/useBrazilCities";
import { mensagemDeErro } from "../../../lib/erro";

// Tipagem de Estados de Visualização (Sincronizada com o Orquestrador)
export type ViewState = 'menu' | 'access-options' | 'about' | 'contact' | 'login-owner' | 'login-dependent' | 'viewer-only' | 'signup' | 'planet-blocked' | 'login-developer' | 'select-tenant' | 'waiting-approval' | 'complete-profile';

export interface TenantLink {
  tenant_id: string;
  role: string;
  tenants: {
    tenant_name: string;
    slug: string;
    users?: {
      full_name: string;
      email: string;
      is_active: boolean;
    };
  };
}

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
  // Usuário autenticado aguardando o fim do cadastro (só o fluxo 'complete-profile' usa).
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', confirm_password: '', planet: 'TERRA', country: 'BRASIL', state: '', city: ''
  });

  // --- ESTADOS DE LOCALIZAÇÃO ---
  // Países e estados vêm prontos do Core (lista estática, sem rede).
  // Só as cidades dependem de API — o IBGE, num hook compartilhado com a edição
  // de perfil do dashboard, para não existirem duas cópias da mesma busca.
  const countriesOptions = COUNTRIES;
  const statesOptions = BRAZIL_STATES;
  const citiesOptions = useBrazilCities(formData.country, formData.state);

  // --- QUEM CHEGA EM /auth/complete-profile PELA URL ---
  // No fluxo do popup o usuário já vem com `currentUser` preenchido pelo login.
  // Aqui cobrimos a outra porta: o dashboard mandou o usuário para a página de
  // completar cadastro, e este hook nasce sem saber quem ele é. Buscamos a sessão
  // e adiantamos no formulário o que o Google já entregou (nome), para ele não
  // digitar de novo o que a plataforma já sabe.
  useEffect(() => {
    if (view !== 'complete-profile' || currentUser) return;

    const carregarUsuarioPendente = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Sem sessão não há cadastro a completar: devolve à guarita.
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
        // Perfil ilegível não trava a tela: o usuário preenche do zero.
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
      setView('planet-blocked');
    }
  };

  const goHome = () => {
    setView('menu');
    setMessage(null);
    setPegadinha(false);
    setShowPassword(false);
    setShowHelpOptions(false);
    setUserTenants([]);
    setFormData({ full_name: '', email: '', password: '', confirm_password: '', planet: 'TERRA', country: 'BRASIL', state: '', city: '' });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (formData.password !== formData.confirm_password) {
      setMessage({ text: "❌ As senhas não coincidem!", type: "error" });
      setLoading(false); return;
    }

    // 🌍 PAÍS OBRIGATÓRIO (v4): bloqueia o envio antes de tocar no Supabase.
    if (!formData.country || !formData.country.trim()) {
      setMessage({ text: "❌ Informe o país. Este campo é obrigatório.", type: "error" });
      setLoading(false); return;
    }

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
          role: 'pending'
        }
      }
    });

    if (error) setMessage({ text: "❌ Erro: " + error.message, type: "error" });
    else {
      // Registro local da nova triagem — sem provedor de e-mail externo.
      authService.notifyAdminNewUser(formData.full_name, formData.email);
      // v4: acesso imediato — não há confirmação de e-mail bloqueando a entrada.
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

    telemetry.capture(ANALYTICS_EVENTS.AUTH_ATTEMPT_SUBMIT, {
      [ANALYTICS_PROPERTIES.USER_EMAIL]: emailLower,
      [ANALYTICS_PROPERTIES.SELECTED_ROLE]: view
    });

    if (view === 'login-developer') {
      const devAuth = await authService.developerSignIn(emailLower, formData.password);
      if (devAuth.success) {
        sessionStorage.setItem('dev_vip_access', 'true');
        router.push("/dashboard");
        return;
      } else {
        setMessage({ text: "❌ Credenciais Inválidas.", type: "error" });
        setLoading(false); return;
      }
    }

    try {
      const response = await loginWithCatracaAction(emailLower, formData.password);
      if (!response.success) throw new Error(response.error);
      if (response.session) await supabase.auth.setSession(response.session);

      const user = response.user!;
      telemetry.identify(user.id, { [ANALYTICS_PROPERTIES.USER_EMAIL]: user.email });

      if (user.email === 'admin@pjodc.ia') {
        sessionStorage.setItem('dev_vip_access', 'true');
        router.push("/dashboard"); return;
      }

      const roleToFind = view === 'login-owner' ? 'OWNER' : 'DEPENDENT';
      const members = await authService.getUserTenants(user.id, roleToFind);

      if (!members || members.length === 0) {
        // Era um ternário usado como comando: lia-se como se devolvesse algo, e
        // o ESLint reclamava disso. São dois desfechos distintos — o Proprietário
        // ainda não promovido vai à sala de espera; o Dependente recebe erro.
        if (view === 'login-owner') setView('waiting-approval');
        else setMessage({ text: "❌ Sem vínculos encontrados.", type: "error" });
        setLoading(false); return;
      }

      const vinculos = members as unknown as TenantLink[];
      if (vinculos.length === 1) handleSelectTenant(vinculos[0]);
      else { setUserTenants(vinculos); setView('select-tenant'); }
    } catch (error: unknown) {
      setMessage({ text: "❌ Falha: " + mensagemDeErro(error), type: "error" });
    } finally { setLoading(false); }
  };

  /**
   * ✅ TRIAGEM PÓS-LOGIN DO PROPRIETÁRIO (Google)
   * Mesma decisão que o login por senha já toma para o 'login-owner': nenhum
   * vínculo -> sala de espera; um vínculo -> entra direto; vários -> seletor.
   * Fica isolado aqui para não tocar no handleSignIn, que continua servindo
   * Dependente e Desenvolvedor sem alteração alguma.
   */
  const encaminharProprietario = async (userId: string) => {
    const members = await authService.getUserTenants(userId, 'OWNER');

    if (!members || members.length === 0) {
      setView('waiting-approval');
      return;
    }

    // Sem `as any`: getUserTenants já devolve any[], o molde seria redundante.
    if (members.length === 1) handleSelectTenant(members[0]);
    else { setUserTenants(members); setView('select-tenant'); }
  };

  /**
   * 🔑 LOGIN GOOGLE DO PROPRIETÁRIO — CAMINHO PRINCIPAL (POPUP)
   * Recebe a credencial que o botão do Google devolveu e a troca por sessão do
   * Supabase no Core. Exclusivo do 'login-owner'.
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
      // para que o middleware e as Server Actions enxerguem o mesmo usuário.
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
      // Sem planeta, país, estado e cidade, o usuário não segue para a triagem.
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
   * A volta acontece em /auth/google/callback, que grava os cookies e manda
   * para o dashboard. Não há triagem aqui: quem redireciona sai da página.
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
   * Encerra as DUAS metades da sessão (navegador e cookies) e volta à guarita —
   * um "voltar" comum deixaria o usuário logado e o portão o traria de volta.
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
      alert("⚠️ EMPRESA DESABILITADA."); return;
    }
    telemetry.group('tenant', tenant.tenant_id, { name: tenant.tenants.tenant_name });
    sessionStorage.setItem('active_tenant_id', tenant.tenant_id);
    sessionStorage.setItem('user_role_context', tenant.role);
    router.push("/dashboard");
  };

  return {
    view, setView, loading, showPassword, setShowPassword, pegadinha, setPegadinha,
    showHelpOptions, setShowHelpOptions, message, setMessage,
    userTenants, formData, countriesOptions, statesOptions, citiesOptions,
    currentUser,
    handleInputChange, goHome, handleSignUp, handleSignIn, handleSelectTenant,
    handleGoogleSignIn, handleGoogleError, handleGoogleRedirect,
    handleCompleteProfile, handleLogout
  };
}
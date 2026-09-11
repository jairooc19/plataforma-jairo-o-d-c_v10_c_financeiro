import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  supabase,
  profileService,
  telemetry,
  ANALYTICS_EVENTS,
  ANALYTICS_PROPERTIES,
  type UserProfile,
  type ProfileInput,
} from '@jairo/core';
import { logoutService } from '@/services/logoutService';
import { errorService } from '@/services/errorService';

/** Os três painéis do Meu Perfil. Um de cada vez, nunca dois. */
export type PainelPerfil = 'detalhes' | 'editar' | 'apagar';

const FORM_VAZIO: ProfileInput = {
  full_name: '',
  planet: 'TERRA',
  country: 'BRASIL',
  state: '',
  city: '',
};

/**
 * 👤 CÉREBRO DO MEU PERFIL — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/profile/useProfileScreen.ts
 *
 * Espelho do `useProfileModal` da web
 * (`apps/admin-web/src/components/dashboard/profile/useProfileModal.ts`), com as
 * mesmas três operações e as mesmas regras. Só a saída difere, e por um motivo
 * concreto: lá o encerramento é `encerrarSessao()` + `window.location.href`,
 * porque a sessão da web também vive em cookies HTTP. Aqui é
 * `logoutService.logout()` + `router.replace` — no telemóvel não há cookie nem
 * servidor. Ver o cabeçalho de `services/logoutService.ts`.
 *
 * 🔁 A WEB MONTA E DESMONTA O MODAL A CADA ABERTURA para nascer com estado
 * limpo; aqui a tela é uma ABA, e uma aba não desmonta ao trocar de aba. Por
 * isso existe o `recarregar`: ao voltar de uma edição bem-sucedida o perfil é
 * relido do banco em vez de confiar no que ficou em memória.
 *
 * 🔧 O DESENVOLVEDOR NÃO TEM PERFIL, e por isso o hook recebe `habilitado`. Ele
 * entra pela credencial fixa do Core, sem passar pelo Supabase Auth: não há
 * sessão para `getUser()` achar nem linha em `public.users` para `getProfile`
 * ler. Chamar assim mesmo produziria um erro de "sessão não encontrada" que não
 * descreve o que houve. A tela pergunta o papel e só liga o hook quando faz
 * sentido — hook não pode ser condicional, o carregamento pode.
 */
export function useProfileScreen(habilitado: boolean) {
  const router = useRouter();

  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileInput>(FORM_VAZIO);
  const [painel, setPainel] = useState<PainelPerfil>('detalhes');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [apagando, setApagando] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setErro('Sessão não encontrada. Entre novamente.');
        return;
      }

      const dados = await profileService.getProfile(user.id);
      setPerfil(dados);
      setForm({
        full_name: dados.full_name || '',
        planet: dados.planet || 'TERRA',
        country: dados.country || 'BRASIL',
        state: dados.state || '',
        city: dados.city || '',
      });
    } catch (e) {
      errorService.registrar('PERFIL', e);
      setErro('Não foi possível carregar o seu perfil.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!habilitado) {
      setCarregando(false);
      return;
    }
    carregar();
  }, [habilitado, carregar]);

  /**
   * Espelha o formulário de cadastro: nome e dados geográficos em MAIÚSCULAS, que
   * é como o banco os guarda. Trocar de estado zera a cidade — a antiga não
   * pertence ao estado novo, e deixá-la ali grava um par impossível.
   */
  const alterarCampo = useCallback((campo: keyof ProfileInput, valor: string) => {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor.toUpperCase(),
      ...(campo === 'state' ? { city: '' } : {}),
    }));
  }, []);

  const abrirPainel = useCallback((destino: PainelPerfil) => {
    setErro(null);
    setSucesso(null);
    setPainel(destino);
  }, []);

  /** Descarta o que foi digitado e volta à leitura, com os valores do banco. */
  const cancelarEdicao = useCallback(() => {
    if (perfil) {
      setForm({
        full_name: perfil.full_name || '',
        planet: perfil.planet || 'TERRA',
        country: perfil.country || 'BRASIL',
        state: perfil.state || '',
        city: perfil.city || '',
      });
    }
    abrirPainel('detalhes');
  }, [perfil, abrirPainel]);

  const salvar = useCallback(async () => {
    if (!perfil) return;

    setSalvando(true);
    setErro(null);
    setSucesso(null);

    try {
      const atualizado = await profileService.updateProfile(perfil.id, form);
      setPerfil(atualizado);
      telemetry.capture(ANALYTICS_EVENTS.PROFILE_UPDATED, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: atualizado.email,
      });
      setSucesso('Perfil atualizado com sucesso.');
      setPainel('detalhes');
    } catch (e) {
      errorService.registrar('PERFIL', e);
      setErro(errorService.mensagem(e));
    } finally {
      setSalvando(false);
    }
  }, [perfil, form]);

  /**
   * 💀 Apaga a conta e SAI. O logout é obrigatório: sem ele o aparelho ficaria
   * com o token de um usuário que não existe mais, e o `restoreSession` do
   * próximo boot o devolveria ao supabase-js — o app abriria "logado" numa conta
   * apagada, e cada consulta falharia com um erro incompreensível.
   *
   * A recusa do banco (dono de empresa, ou id diferente do da sessão) chega como
   * exceção, com a mensagem pronta para ser lida.
   */
  const apagarConta = useCallback(async () => {
    if (!perfil) return;

    setApagando(true);
    setErro(null);

    try {
      await profileService.deleteAccountPermanently(perfil.id);
      telemetry.capture(ANALYTICS_EVENTS.ACCOUNT_DELETED, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: perfil.email,
      });

      await logoutService.logout();
      router.replace('/(auth)');
    } catch (e) {
      errorService.registrar('PERFIL', e);
      setErro(errorService.mensagem(e));
      setApagando(false);
    }
  }, [perfil, router]);

  return {
    perfil, form, painel,
    carregando, salvando, apagando,
    erro, sucesso,
    abrirPainel, alterarCampo, cancelarEdicao, salvar, apagarConta,
  };
}

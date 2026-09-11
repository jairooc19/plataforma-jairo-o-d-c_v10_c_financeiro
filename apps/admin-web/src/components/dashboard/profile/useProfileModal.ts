"use client";

import { useState, useEffect } from "react";
import {
  profileService,
  telemetry,
  ANALYTICS_EVENTS,
  ANALYTICS_PROPERTIES,
  type UserProfile,
  type ProfileInput,
} from "@jairo/core";
import { encerrarSessao } from "@/lib/logout";

/** Painéis possíveis dentro do modal. Um de cada vez, nunca dois. */
export type ProfilePanel = 'details' | 'edit' | 'delete';

const FORM_VAZIO: ProfileInput = {
  full_name: '', planet: 'TERRA', country: 'BRASIL', state: '', city: '',
};

/**
 * 👤 CÉREBRO DO MODAL DE PERFIL (PJODC v10)
 * Local: apps/admin-web/src/components/dashboard/profile/useProfileModal.ts
 *
 * Guarda todo o estado e as chamadas de serviço; as views desta pasta só desenham.
 *
 * 🧹 NASCE E MORRE COM O MODAL. O componente é montado só enquanto está aberto
 * (quem decide é o dashboard, com `{aberto && <ProfileModal/>}`), então cada
 * abertura começa do zero: painel em "details", sem mensagens e com o perfil
 * recém-lido do banco. Foi de propósito — a alternativa era manter o hook vivo e
 * zerar tudo num efeito a cada abertura, o que gera renderização em cascata e
 * reabriria o modal com dados velhos se o perfil tivesse mudado noutra aba.
 */
export function useProfileModal(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileInput>(FORM_VAZIO);
  const [panel, setPanel] = useState<ProfilePanel>('details');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelado = false;

    const carregarPerfil = async () => {
      try {
        const dados = await profileService.getProfile(userId);
        if (cancelado) return;
        setProfile(dados);
        setForm({
          full_name: dados.full_name || '',
          planet: dados.planet || 'TERRA',
          country: dados.country || 'BRASIL',
          state: dados.state || '',
          city: dados.city || '',
        });
      } catch (erro: unknown) {
        if (!cancelado) setError(erro instanceof Error ? erro.message : 'Erro ao ler o perfil.');
      }
    };

    carregarPerfil();
    return () => { cancelado = true; };
  }, [userId]);

  /**
   * Espelha o comportamento do formulário de cadastro: dados geográficos e nome
   * em MAIÚSCULAS (é assim que o banco os guarda). Trocar de estado zera a
   * cidade — a antiga não pertence ao estado novo.
   */
  const alterarCampo = (name: string, value: string) => {
    const finalValue = ['planet', 'country', 'state', 'city', 'full_name'].includes(name)
      ? value.toUpperCase()
      : value;

    setForm(prev => ({
      ...prev,
      [name]: finalValue,
      ...(name === 'state' ? { city: '' } : {}),
    }));
  };

  const abrirPainel = (destino: ProfilePanel) => {
    setError("");
    setSuccess("");
    setPanel(destino);
  };

  const salvar = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const atualizado = await profileService.updateProfile(userId, form);
      setProfile(atualizado);
      telemetry.capture(ANALYTICS_EVENTS.PROFILE_UPDATED, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: atualizado.email,
      });
      setSuccess("Perfil atualizado com sucesso.");
      setPanel('details');
    } catch (erro: unknown) {
      setError(erro instanceof Error ? erro.message : 'Erro ao salvar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 💀 Apaga a conta e SAI. O `encerrarSessao` é obrigatório: sem ele o navegador
   * ficaria com o token de um usuário que não existe mais, e cada requisição
   * seguinte falharia com um erro incompreensível em vez de mostrar a guarita.
   *
   * A recusa do banco (dono de empresa, ou id diferente do da sessão) chega aqui
   * como exceção, com a mensagem pronta para o usuário ler.
   */
  const apagarConta = async () => {
    setDeleting(true);
    setError("");

    try {
      await profileService.deleteAccountPermanently(userId);
      telemetry.capture(ANALYTICS_EVENTS.ACCOUNT_DELETED, {
        [ANALYTICS_PROPERTIES.USER_EMAIL]: profile?.email,
      });
      telemetry.reset();
      setSuccess("Conta apagada. Encerrando a sessão...");
      await encerrarSessao();
      window.location.href = "/";
    } catch (erro: unknown) {
      setError(erro instanceof Error ? erro.message : 'Erro ao apagar a conta.');
      setDeleting(false);
    }
  };

  return {
    profile, form, panel, loading, deleting, error, success,
    abrirPainel, alterarCampo, salvar, apagarConta,
  };
}

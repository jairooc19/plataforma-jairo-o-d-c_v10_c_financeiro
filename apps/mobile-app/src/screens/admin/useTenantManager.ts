import { useCallback, useEffect, useState } from 'react';
import { adminApiService, type AdminTenantLink, type TenantSyncData } from '@jairo/core';
import { errorService } from '@/services/errorService';

/**
 * 🏢 CÉREBRO DO GERENCIADOR DE EMPRESAS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/useTenantManager.ts
 *
 * Espelho da metade "modal" de `apps/admin-web/src/app/dashboard/tenants/page.tsx`:
 * habilitar infraestrutura para um usuário, remover empresas e reabilitar as que
 * foram removidas antes.
 *
 * 🗑️ REMOVER NÃO APAGA — DESATIVA, e essa é a regra mais importante daqui. Uma
 * empresa "removida" entra em `removidas`, o servidor grava `is_active = false`
 * e a linha continua no banco com todos os dados. Por isso existe o histórico
 * com o botão Reabilitar: o que se desfaz aqui é reversível, e a tela precisa
 * dizer isso. Empresa criada agora (`isNew`) e removida antes de salvar some sem
 * ir para o histórico — ela nunca chegou a existir no banco.
 *
 * ⚠️ `tenant_id` SÓ EXISTE EM EMPRESA JÁ GRAVADA. É por isso que ele é opcional
 * em `TenantSyncData` e por isso a remoção testa antes de empurrá-lo para a
 * lista de removidas, que é `string[]`: um `undefined` ali viraria uma
 * desativação com id nulo do outro lado.
 *
 * 💾 A GRAVAÇÃO É UMA CHAMADA SÓ. Criar, desativar, reabilitar e ajustar o papel
 * do usuário são efeitos de uma operação única — quebrá-los em chamadas
 * separadas deixaria o usuário com papel incoerente se a segunda falhasse. É a
 * proibição do CLAUDE.md sobre operação transacional, valendo também através da
 * rede.
 */
export function useTenantManager(userId: string | null, aoConcluir: () => void) {
  const [ativas, setAtivas] = useState<TenantSyncData[]>([]);
  const [inativas, setInativas] = useState<TenantSyncData[]>([]);
  const [removidas, setRemovidas] = useState<string[]>([]);

  const [nomeNovo, setNomeNovo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelado = false;

    const paraSync = (v: AdminTenantLink): TenantSyncData => ({
      member_id: v.id,
      tenant_id: v.tenants.id,
      name: v.tenants.tenant_name,
      slug: v.tenants.slug,
      is_active: v.tenants.is_active,
      isNew: false,
    });

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      setAtivas([]);
      setInativas([]);
      setRemovidas([]);
      setNomeNovo('');

      try {
        const vinculos = await adminApiService.listarEmpresasDoUsuario(userId);
        if (cancelado) return;

        // Vínculo sem empresa embutida não deveria existir, mas o PostgREST
        // devolve `null` quando a linha de `tenants` sumiu — ler `.id` dali
        // derrubaria a tela inteira por causa de uma linha órfã.
        const comEmpresa = vinculos.filter((v) => !!v.tenants);

        setAtivas(comEmpresa.filter((v) => v.tenants.is_active).map(paraSync));
        setInativas(
          comEmpresa
            .filter((v) => !v.tenants.is_active)
            .map((v) => ({ ...paraSync(v), is_active: false }))
        );
      } catch (e) {
        errorService.registrar('COMANDOS', e);
        if (!cancelado) setErro(errorService.mensagem(e));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
  }, [userId]);

  const adicionar = useCallback(() => {
    const nome = nomeNovo.trim();
    if (!nome) return;

    setAtivas((anterior) => [
      ...anterior,
      { name: nome, slug: nome.toLowerCase().replace(/ /g, '-'), is_active: true, isNew: true },
    ]);
    setNomeNovo('');
  }, [nomeNovo]);

  const remover = useCallback((indice: number) => {
    setAtivas((anterior) => {
      const alvo = anterior[indice];
      if (!alvo) return anterior;

      if (!alvo.isNew) {
        const id = alvo.tenant_id;
        if (id) setRemovidas((ids) => [...ids, id]);
        setInativas((lista) => [...lista, { ...alvo, is_active: false }]);
      }

      return anterior.filter((_, i) => i !== indice);
    });
  }, []);

  const reabilitar = useCallback((indice: number) => {
    setInativas((anterior) => {
      const alvo = anterior[indice];
      if (!alvo) return anterior;

      setRemovidas((ids) => ids.filter((id) => id !== alvo.tenant_id));
      setAtivas((lista) => [...lista, { ...alvo, is_active: true }]);

      return anterior.filter((_, i) => i !== indice);
    });
  }, []);

  const salvar = useCallback(async () => {
    if (!userId) return;

    setSalvando(true);
    setErro(null);

    try {
      await adminApiService.sincronizarEmpresas(userId, ativas, removidas);
      aoConcluir();
    } catch (e) {
      errorService.registrar('COMANDOS', e);

      // A rota deixa esta mensagem passar de propósito: é a única que o usuário
      // consegue corrigir sozinho, trocando o nome que digitou.
      const bruta = errorService.mensagem(e);
      setErro(
        bruta === 'NOME_EMPRESA_DUPLICADO'
          ? 'Esse nome de empresa já está em uso em outro registro.'
          : bruta
      );
    } finally {
      setSalvando(false);
    }
  }, [userId, ativas, removidas, aoConcluir]);

  return {
    ativas,
    inativas,
    nomeNovo,
    carregando,
    salvando,
    erro,
    setNomeNovo,
    adicionar,
    remover,
    reabilitar,
    salvar,
  };
}

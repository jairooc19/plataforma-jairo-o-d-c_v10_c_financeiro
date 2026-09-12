import { useCallback, useEffect, useState } from 'react';
import { tenantService, type EmpresaParaSincronizar } from '@jairo/core';
import { errorService } from '@/services/errorService';

/**
 * 🏢 CÉREBRO DO GERENCIADOR DE EMPRESAS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/useTenantManager.ts
 *
 * Espelho da metade "modal" da Central de Comandos da web: habilitar
 * infraestrutura para um usuário, remover empresas e reabilitar as removidas.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10
 * ===========================================================================
 *  • A gravação virou uma FUNÇÃO TRANSACIONAL no banco
 *    (`admin_sync_user_tenants`). Antes eram várias gravações separadas, feitas
 *    pelo servidor da web através de uma rota sem autenticação: um erro no meio
 *    deixava empresa criada e papel do usuário desatualizado.
 *  • Sumiram o `slug` e o `isNew` do formato enviado. O banco gera o slug — ele
 *    é quem conhece os que já existem — e "empresa nova" passou a ser
 *    simplesmente `tenant_id` ausente.
 *
 * 🗑️ REMOVER NÃO APAGA — DESATIVA. Uma empresa "removida" entra em `removidas`,
 * o banco grava `is_active = false` e a linha continua lá com todos os dados.
 * Por isso existe o histórico com o botão Reabilitar. Empresa criada agora e
 * removida antes de salvar some sem ir para o histórico: nunca existiu no banco.
 */
export function useTenantManager(userId: string | null, aoConcluir: () => void) {
  const [ativas, setAtivas] = useState<EmpresaParaSincronizar[]>([]);
  const [inativas, setInativas] = useState<EmpresaParaSincronizar[]>([]);
  const [removidas, setRemovidas] = useState<string[]>([]);

  const [nomeNovo, setNomeNovo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelado = false;

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      setAtivas([]);
      setInativas([]);
      setRemovidas([]);
      setNomeNovo('');

      try {
        const empresas = await tenantService.listarEmpresasDoUsuario(userId);
        if (cancelado) return;

        setAtivas(
          empresas
            .filter((e) => e.is_active)
            .map((e) => ({ tenant_id: e.tenant_id, name: e.tenant_name, is_active: true }))
        );
        setInativas(
          empresas
            .filter((e) => !e.is_active)
            .map((e) => ({ tenant_id: e.tenant_id, name: e.tenant_name, is_active: false }))
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

    setAtivas((anterior) => [...anterior, { name: nome, is_active: true }]);
    setNomeNovo('');
  }, [nomeNovo]);

  const remover = useCallback((indice: number) => {
    setAtivas((anterior) => {
      const alvo = anterior[indice];
      if (!alvo) return anterior;

      // ⚠️ `tenant_id` só existe em empresa já gravada. Empurrar `undefined` para
      // a lista de removidas (que é `string[]`) viraria uma desativação com id
      // nulo do outro lado.
      if (alvo.tenant_id) {
        const id = alvo.tenant_id;
        setRemovidas((ids) => [...ids, id]);
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
      await tenantService.sincronizarEmpresas(userId, ativas, removidas);
      aoConcluir();
    } catch (e) {
      errorService.registrar('COMANDOS', e);

      // A função do banco levanta esta mensagem exata: é a única que o operador
      // consegue corrigir sozinho, trocando o nome que digitou.
      const bruta = errorService.mensagem(e);
      setErro(
        bruta.includes('NOME_EMPRESA_DUPLICADO')
          ? 'Este usuário já tem uma empresa com esse nome.'
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

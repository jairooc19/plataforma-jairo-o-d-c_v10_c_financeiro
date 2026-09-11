import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { authService, supabase, telemetry } from '@jairo/core';
import { storageService } from '../services/storageService';

/** Vínculo empresa↔usuário, como o `getUserTenants` do Core devolve. */
export interface TenantLink {
  tenant_id: string;
  role: string;
  tenants: {
    tenant_name: string;
    slug: string;
    is_active?: boolean;
    users?: { full_name: string; email: string; is_active: boolean };
  };
}

export type PapelTriagem = 'OWNER' | 'DEPENDENT';

/**
 * 🏢 TRIAGEM DE EMPRESAS (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useTenantTriage.ts
 *
 * A MESMA decisão de três saídas que a web toma depois de qualquer login:
 * nenhum vínculo → sala de espera; um vínculo → entra direto; vários → seletor.
 *
 * Fica num hook próprio porque TRÊS caminhos precisam dela e não podem divergir:
 * o login por senha (Dependente), o login por Google (Proprietário) e o fim do
 * "Completar Cadastro". Na web essa lógica está duplicada entre `handleSignIn` e
 * `encaminharProprietario` — aqui é uma cópia só.
 *
 * ⚠️ `getUserTenants` EXIGE O PAPEL como segundo argumento. Ele filtra por
 * `role` na consulta: chamar sem o papel não devolve "todos os vínculos", não
 * compila. Um Proprietário consultado como 'DEPENDENT' volta com zero vínculos e
 * cairia na sala de espera para sempre.
 */
export function useTenantTriage() {
  const router = useRouter();

  /**
   * Grava o contexto escolhido e entra no dashboard.
   *
   * ⚠️ O token vem de `getSession()`, e não do retorno do login: depois do
   * `signInWithPassword` o supabase-js já pode ter renovado o access token, e
   * gravar o valor antigo deixaria o cofre defasado logo no primeiro acesso.
   */
  const entrarNaEmpresa = async (tenant: TenantLink) => {
    if (tenant.tenants.users?.is_active === false) {
      Alert.alert('Empresa desabilitada', 'O proprietário desta empresa está inativo.');
      return;
    }

    telemetry.group('tenant', tenant.tenant_id, { name: tenant.tenants.tenant_name });

    const { data } = await supabase.auth.getSession();
    await storageService.saveSession(
      data.session?.access_token ?? 'sessao-local',
      tenant.tenant_id,
      tenant.role
    );
    if (data.session) await storageService.saveAuthSession(data.session);

    router.replace('/(tabs)');
  };

  /**
   * Decide para onde o usuário vai depois de autenticado.
   * Devolve `'sem-vinculos'` para a tela decidir a mensagem — Proprietário sem
   * empresa vai para "Aguardando Triagem", Dependente recebe um erro comum.
   */
  const triar = async (
    userId: string,
    papel: PapelTriagem
  ): Promise<'entrou' | 'sem-vinculos' | 'multiplas'> => {
    const membros = (await authService.getUserTenants(userId, papel)) as TenantLink[];

    if (!membros || membros.length === 0) return 'sem-vinculos';

    if (membros.length === 1) {
      await entrarNaEmpresa(membros[0]);
      return 'entrou';
    }

    router.push({ pathname: '/(auth)/select-tenant', params: { papel } });
    return 'multiplas';
  };

  return { triar, entrarNaEmpresa };
}

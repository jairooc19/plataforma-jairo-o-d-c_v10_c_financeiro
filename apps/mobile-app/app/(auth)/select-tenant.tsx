import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { authService, supabase } from '@jairo/core';
import AuthScreen from '@/components/auth/AuthScreen';
import SelectTenantView from '@/components/auth/SelectTenantView';
import MiscViews from '@/components/auth/MiscViews';
import { useTenantTriage, type TenantLink, type PapelTriagem } from '@/hooks/useTenantTriage';
import { logoutService } from '@/services/logoutService';
import { useRouter } from 'expo-router';

/**
 * 🏢 ROTA: SELETOR DE EMPRESA (PJODC v10)
 * Local: apps/mobile-app/app/(auth)/select-tenant.tsx
 *
 * Só é alcançada quando a triagem encontrou DOIS OU MAIS vínculos.
 *
 * 🔄 A LISTA É BUSCADA AQUI, DE NOVO, em vez de vir empacotada na navegação —
 * e isso é de propósito. Passar objetos por parâmetro de rota exigiria
 * serializá-los em JSON na URL, e a lista se perderia se a tela fosse
 * reconstruída (rotação, retorno de segundo plano, recarregamento do Metro).
 * Buscar de novo custa uma consulta e sempre funciona.
 *
 * ⚠️ O PAPEL VEM POR PARÂMETRO porque `getUserTenants` filtra por ele. Sem o
 * papel certo a consulta volta vazia e a tela mostraria "sem vínculos" a um
 * usuário que acabou de provar ter vários.
 */
export default function SelectTenantScreen() {
  const router = useRouter();
  const { papel } = useLocalSearchParams<{ papel?: string }>();
  const { entrarNaEmpresa } = useTenantTriage();

  const [tenants, setTenants] = useState<TenantLink[]>([]);
  const [loading, setLoading] = useState(true);

  const papelAtual: PapelTriagem = papel === 'OWNER' ? 'OWNER' : 'DEPENDENT';

  useEffect(() => {
    let cancelado = false;

    const carregar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace('/(auth)'); return; }

        const lista = (await authService.getUserTenants(user.id, papelAtual)) as TenantLink[];
        if (!cancelado) setTenants(lista ?? []);
      } catch (erro) {
        console.error('[SELECT-TENANT] Vínculos não puderam ser carregados:', erro);
        if (!cancelado) setTenants([]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    carregar();
    return () => { cancelado = true; };
  }, [papelAtual, router]);

  const sair = async () => {
    await logoutService.logout();
    router.replace('/(auth)');
  };

  // A lista esvaziou entre a triagem e esta tela (vínculo revogado no intervalo).
  if (!loading && tenants.length === 0) {
    return (
      <AuthScreen semMarca>
        <MiscViews view="waiting-approval" onBack={sair} />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen semMarca>
      <SelectTenantView
        tenants={tenants}
        onSelect={entrarNaEmpresa}
        onBack={sair}
        loading={loading}
      />
    </AuthScreen>
  );
}

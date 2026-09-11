import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApiService, type AdminUser } from '@jairo/core';
import { errorService } from '@/services/errorService';

/**
 * 🛰️ CÉREBRO DA CENTRAL DE COMANDOS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/useCommandCenter.ts
 *
 * Espelho de `apps/admin-web/src/app/dashboard/tenants/page.tsx` na parte da
 * LISTAGEM. A gestão de empresas de um usuário é outro assunto e vive no
 * `useTenantManager` — na web as duas coisas dividem o mesmo arquivo de 311
 * linhas, que é exatamente a concentração que a regra de ouro proíbe.
 *
 * 🔀 A DIVISÃO EM DUAS LISTAS SEGUE A WEB, INCLUSIVE NO CRITÉRIO ESTRANHO:
 * pendente é quem tem `role` em `pending` OU `user`, e operacional é quem tem
 * exatamente `active`. O `user` é resíduo de cadastros antigos; tirá-lo do
 * filtro esconderia esses usuários das duas listas — sumiriam da tela sem
 * deixar rastro. A comparação é em minúsculas porque o banco guarda os dois
 * formatos.
 *
 * ⚠️ QUEM NÃO É `pending`, `user` NEM `active` NÃO APARECE EM LISTA NENHUMA — e
 * isso também é fiel à web. Um papel inesperado simplesmente não é listado.
 * Vale conhecer o comportamento antes de estranhar um usuário ausente.
 */
export function useCommandCenter() {
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await adminApiService.listarUsuarios();
      setUsuarios(lista);
    } catch (e) {
      errorService.registrar('COMANDOS', e);
      setErro(errorService.mensagem(e));
      setUsuarios([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const pendentes = useMemo(
    () =>
      usuarios.filter((u) => {
        const papel = (u.role || '').toLowerCase();
        return papel === 'pending' || papel === 'user';
      }),
    [usuarios]
  );

  const operacionais = useMemo(
    () => usuarios.filter((u) => (u.role || '').toLowerCase() === 'active'),
    [usuarios]
  );

  return { usuarios, pendentes, operacionais, carregando, erro, recarregar: carregar };
}

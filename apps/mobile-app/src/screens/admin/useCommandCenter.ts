import { useCallback, useEffect, useMemo, useState } from 'react';
import { tenantService, type UsuarioAdmin } from '@jairo/core';
import { errorService } from '@/services/errorService';

/**
 * 🛰️ CÉREBRO DA CENTRAL DE COMANDOS — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/screens/admin/useCommandCenter.ts
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: SUMIU A PONTE HTTP
 * ===========================================================================
 * Até a v9 esta tela chamava `adminApiService`, que fazia uma requisição HTTP
 * para a rota `/api/admin/users` do site — uma rota que rodava com a CHAVE
 * MESTRA e NÃO PEDIA IDENTIFICAÇÃO. O desvio existia porque o Desenvolvedor do
 * aplicativo não tinha sessão nenhuma: a credencial dele era fixa no código.
 *
 * Agora ele tem sessão de verdade, e a lista vem da função `admin_list_users()`
 * do banco, que confere `is_superuser()`. Consequências:
 *   • a rota aberta deixou de existir;
 *   • `EXPO_PUBLIC_API_URL` deixou de ser necessária;
 *   • a mesma chamada serve para a web e para o aparelho.
 *
 * 🔀 A DIVISÃO EM DUAS LISTAS SEGUE A WEB, INCLUSIVE NO CRITÉRIO ESTRANHO:
 * pendente é quem tem `role` em `pending` OU `user`, e operacional é quem tem
 * exatamente `active`. O `user` é resíduo de cadastros antigos; tirá-lo do
 * filtro esconderia esses usuários das duas listas.
 */
export function useCommandCenter() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const lista = await tenantService.listarUsuarios();
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

import { resolverApiBaseUrl } from '../../lib/apiBaseUrl';
import type { TenantSyncData } from './tenantService';
import type { GlobalSettings } from './settingsService';

/**
 * 🛰️ ADMIN API SERVICE — as operações que só o servidor pode fazer (PJODC v10)
 * Local: packages/core/src/services/platform/adminApiService.ts
 *
 * O Painel de Engenharia precisa de quatro coisas que o cliente NÃO pode fazer
 * sozinho: listar todos os usuários, ler as empresas de um deles, sincronizar
 * essas empresas e gravar os ajustes globais do white-label. As quatro exigem a
 * SERVICE ROLE — `supabaseAdmin` — e por isso vivem atrás de HTTP.
 *
 * ⛔ POR QUE NÃO CHAMAR O `tenantService` DIRETO NO MOBILE: ele usa
 * `supabaseAdmin`, e pôr a service role no aparelho é a proibição nº 1 do
 * CLAUDE.md — a chave viajaria dentro do APK, onde qualquer um a extrai. Este
 * serviço é a alternativa: a chave fica no servidor do `admin-web`, e o
 * telemóvel só conversa com ele.
 *
 * ⛔ E POR QUE A RLS TAMBÉM NÃO RESOLVE: o Desenvolvedor do mobile entra pela
 * credencial fixa do Core (`authService.developerSignIn`), sem passar pelo
 * Supabase Auth. Não há sessão, `auth.uid()` é nulo e nenhuma policy o
 * reconhece. Não é questão de escrever a policy certa — não há identidade a
 * comparar.
 *
 * ⚠️ AS ROTAS DE DESTINO NÃO TÊM AUTENTICAÇÃO, como as demais `/api` deste
 * projeto. Quem souber a URL chama. É a postura que o repositório já tinha
 * (ver a credencial fixa do Painel de Engenharia no CLAUDE.md) e este serviço
 * não a piora nem a conserta — apenas passa a usá-la de outro cliente. Quando
 * for endurecida, o lugar de pôr o cabeçalho de segredo é AQUI, num só ponto.
 *
 * 🧭 A LEITURA DOS AJUSTES NÃO PASSA POR AQUI, de propósito: `global_settings` é
 * legível pelo cliente anon (é o que o `_layout.tsx` do mobile já faz no boot),
 * então continua sendo `settingsService.getGlobalSettings()`. Só a GRAVAÇÃO
 * precisa de servidor. Duplicar a leitura aqui criaria dois caminhos para o
 * mesmo dado, e um deles ficaria desatualizado.
 */

/** Linha de `public.users` como o Painel de Engenharia a lê. */
export interface AdminUser {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean;
  is_client_owner?: boolean;
  created_at?: string;
}

/** Vínculo OWNER com a empresa embutida, como a rota o devolve. */
export interface AdminTenantLink {
  id: string;
  tenants: {
    id: string;
    tenant_name: string;
    slug: string;
    is_active: boolean;
  };
}

/** Envelope comum das rotas: `{ success, data? , error? }`. */
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Faz a chamada e desembrulha o envelope.
 *
 * ⚠️ O ERRO DO SERVIDOR VEM NO CORPO, NÃO SÓ NO STATUS. As rotas respondem 500
 * com `{ success: false, error }`, e é o `error` que descreve o problema —
 * `NOME_EMPRESA_DUPLICADO`, por exemplo, é o que a tela precisa ler para dizer
 * ao usuário o que corrigir. Olhar só `response.ok` jogaria fora a única
 * informação útil e mostraria "erro 500" a quem só digitou um nome repetido.
 */
async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const base = resolverApiBaseUrl(true);

  let resposta: Response;
  try {
    resposta = await fetch(`${base}${caminho}`, init);
  } catch {
    // Falha de transporte: o servidor não respondeu. Distinguir isto do erro de
    // negócio importa — aqui não adianta corrigir o formulário, adianta olhar a
    // rede e o endereço.
    throw new Error(
      `Não foi possível falar com o servidor em ${base}. ` +
        'Confira se o admin-web está no ar e se EXPO_PUBLIC_API_URL aponta para ele.'
    );
  }

  let corpo: Envelope<T> | null = null;
  try {
    corpo = (await resposta.json()) as Envelope<T>;
  } catch {
    corpo = null;
  }

  if (!resposta.ok || corpo?.success === false) {
    throw new Error(corpo?.error || `O servidor respondeu ${resposta.status}.`);
  }

  return (corpo?.data ?? (corpo as unknown)) as T;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const adminApiService = {
  /** 📋 Todos os usuários da plataforma, do mais recente para o mais antigo. */
  async listarUsuarios(): Promise<AdminUser[]> {
    const dados = await chamar<AdminUser[]>('/api/admin/users');
    return dados ?? [];
  },

  /** 🏢 As empresas de um usuário (vínculos OWNER), ativas e inativas. */
  async listarEmpresasDoUsuario(userId: string): Promise<AdminTenantLink[]> {
    const dados = await chamar<AdminTenantLink[]>(
      `/api/admin/user-tenants?userId=${encodeURIComponent(userId)}`
    );
    return dados ?? [];
  },

  /**
   * 💾 Grava a lista de empresas do usuário de uma vez.
   *
   * ⚠️ É UMA OPERAÇÃO SÓ, e não uma sequência de chamadas. Criar empresa,
   * reativar empresa, desativar empresa e ajustar o papel do usuário são quatro
   * efeitos que precisam acontecer juntos — a proibição do CLAUDE.md contra
   * quebrar operação transacional em chamadas TypeScript separadas vale igual
   * atravessando a rede, e aqui pior: metade aplicada deixa o usuário sem papel
   * coerente com as empresas que tem.
   */
  async sincronizarEmpresas(
    userId: string,
    tenants: TenantSyncData[],
    deletedIds: string[]
  ): Promise<void> {
    await chamar<void>('/api/admin/sync-tenants', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ userId, tenants, deletedIds }),
    });
  },

  /**
   * 🎨 Grava os ajustes globais (white-label).
   *
   * Usa a `/api/settings` que já existia e que a web já consome — não foi criada
   * rota nova para isto. O corpo é o mesmo objeto que o `settingsService`
   * devolve na leitura, então o que se salva é exatamente o que se leu.
   */
  async salvarAjustesGlobais(ajustes: Partial<GlobalSettings>): Promise<void> {
    await chamar<void>('/api/settings', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(ajustes),
    });
  },
};

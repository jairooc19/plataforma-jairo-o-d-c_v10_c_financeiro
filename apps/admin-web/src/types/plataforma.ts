/**
 * 🧬 FORMAS DOS DADOS DA PLATAFORMA NO ADMIN-WEB (PJODC v10)
 * Local: apps/admin-web/src/types/plataforma.ts
 *
 * Só declarações de tipo — nenhuma lógica, nenhum import de runtime.
 *
 * POR QUE ESTES TIPOS MORAM AQUI E NÃO NO CORE: as funções do Core que os
 * produzem (`getTenantMemberContext`, `getDependentTenants`) devolvem o
 * resultado cru do PostgREST e declaram `Promise<any>` na interface. Tipar de
 * verdade lá dentro é mudar o contrato do Core — e o Core é consumido também
 * pelo mobile. Aqui descrevemos o que o admin-web REALMENTE lê dessas
 * respostas, sem tocar no cérebro compartilhado.
 *
 * ⚠️ `tenants` É OBJETO OU ARRAY, e essa união não é preciosismo. O PostgREST
 * devolve um embed de relação "para um" como objeto, mas a inferência muda com
 * a forma do `select` e com a presença do `!inner`. O código do dashboard já
 * testava `Array.isArray` nos dois pontos onde lê esse campo — a união apenas
 * escreve no tipo o que o runtime sempre fez. Ver `lib/empresaDoContexto.ts`.
 */

/** Dono da empresa, embutido pelo `users!owner_id` do select. */
export interface UsuarioEmbutido {
  full_name?: string;
  email?: string;
  is_active?: boolean;
}

/** Empresa embutida no vínculo. Campos opcionais: cada select pede um subconjunto. */
export interface EmpresaEmbutida {
  id?: string;
  tenant_name?: string;
  slug?: string;
  is_active?: boolean;
  users?: UsuarioEmbutido | null;
}

/** Contexto do membro na empresa ativa — `authService.getTenantMemberContext`. */
export interface ContextoMembro {
  role: string;
  allowed_modules?: string[] | null;
  module_configs?: Record<string, unknown> | null;
  tenants?: EmpresaEmbutida | EmpresaEmbutida[] | null;
}

/**
 * Vínculo de Dependente — `tenantService.getDependentTenants`, consumido pelo
 * `LobbyView`. Aqui `tenants` é objeto simples e não a união: o Lobby lê
 * `item.tenants.id` direto, sem teste de array, desde sempre.
 */
export interface VinculoDependente {
  id: string;
  role: string;
  is_active: boolean;
  module_configs?: Record<string, unknown> | null;
  tenants: {
    id: string;
    tenant_name?: string;
    slug?: string;
    is_active?: boolean;
    users?: UsuarioEmbutido | null;
  };
}

/**
 * Quem está logado no dashboard.
 *
 * ⚠️ TODOS OS CAMPOS SÃO OPCIONAIS de propósito. Este tipo cobre DUAS origens
 * diferentes: o `User` do Supabase (tem `id`, `email`, `user_metadata`) e o
 * Desenvolvedor, que é um objeto montado à mão no próprio dashboard
 * (`{ email, full_name }`) porque a credencial dele é fixa no Core e ele não
 * tem linha em `public.users`. Exigir `id` aqui quebraria o Painel de
 * Engenharia, que nunca teve um.
 */
export interface UsuarioSessao {
  id?: string;
  email?: string;
  full_name?: string;
  user_metadata?: { full_name?: string } | null;
}

/**
 * Linha de `public.users` como o Painel de Engenharia a lê —
 * `tenantService.getAllUsers()`, que pede exatamente estas sete colunas.
 */
export interface UsuarioAdministravel {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean;
  is_client_owner?: boolean;
  created_at?: string;
}

/**
 * Vínculo devolvido por `getUserTenantManagementAction`, antes de virar o
 * `TenantSyncData` que a gravação consome.
 */
export interface VinculoAdministravel {
  id: string;
  tenants: {
    id: string;
    tenant_name: string;
    slug: string;
    is_active: boolean;
  };
}

/**
 * Os oito campos do formulário de cadastro/perfil, compartilhados entre o
 * `useAuthLogic` (que os guarda) e as views que os desenham.
 *
 * Espelha o `AuthFormData` do mobile (`apps/mobile-app/src/hooks/useAuthForm.ts`).
 * São duas cópias porque os dois apps não compartilham código de tela — mas a
 * forma é a mesma, e mudar uma sem a outra é o erro a evitar.
 */
export interface CadastroFormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  planet: string;
  country: string;
  state: string;
  city: string;
}

/** Candidato a Dependente — devolvido pela RPC `get_user_by_email_for_invite`. */
export interface CandidatoDependente {
  id: string;
  full_name?: string | null;
  email: string;
}

/** Membro já vinculado à empresa — `tenantService.getTenantMembers`. */
export interface MembroEquipe {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  module_configs?: Record<string, unknown> | null;
  users: {
    full_name?: string | null;
    email: string;
  };
}

/**
 * 🧬 FORMAS DOS DADOS DA PLATAFORMA NO ADMIN-WEB (PJODC v10)
 * Local: apps/admin-web/src/types/plataforma.ts
 *
 * Só declarações de tipo — nenhuma lógica, nenhum import de runtime.
 *
 * ⚠️ v10 — O QUE SAIU DAQUI. `UsuarioAdministravel`, `VinculoAdministravel`,
 * `CandidatoDependente` e `MembroEquipe` eram cópias locais de formatos que o
 * Core produz. Agora o Core os declara de verdade (`UsuarioAdmin`,
 * `EmpresaAdmin`, `CandidatoDependente`, `MembroDaEquipe`) e as telas os
 * importam de lá: uma coluna que mudar no serviço quebra o build em vez de
 * devolver `undefined` em silêncio.
 *
 * ⚠️ `tenants` É OBJETO OU ARRAY, e essa união não é preciosismo. O PostgREST
 * devolve um embed de relação "para um" como objeto, mas a inferência muda com
 * a forma do `select` e com a presença do `!inner`. Ver `lib/empresaDoContexto.ts`.
 */

/** Dono da empresa, embutido pelo `users!owner_id` do select. */
export interface UsuarioEmbutido {
  full_name?: string | null;
  email?: string | null;
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

/**
 * Contexto do membro na empresa ativa — `authService.getTenantMemberContext`.
 *
 * ⚠️ `allowed_modules` É `string[]`, e agora a coluna do banco também é
 * (`text[]`). Até a v9 o banco guardava TEXTO e este tipo mentia: no dia em que
 * houvesse um módulo, `.map()` quebraria a tela.
 */
export interface ContextoMembro {
  role: string;
  allowed_modules?: string[] | null;
  module_configs?: Record<string, unknown> | null;
  tenants?: EmpresaEmbutida | EmpresaEmbutida[] | null;
}

/**
 * Uma empresa como o Lobby a mostra.
 *
 * 🆕 v10 — O lobby passou a listar TAMBÉM as empresas onde a pessoa é
 * Proprietária. Até a v9 só apareciam os vínculos de Dependente, e um
 * Proprietário com duas empresas não conseguia trocar de contexto.
 */
export interface EmpresaDoLobby {
  tenantId: string;
  nome: string;
  papel: 'OWNER' | 'DEPENDENT' | string;
  gestorNome?: string | null;
  gestorEmail?: string | null;
  /** `false` quando o dono da empresa está inativo: a entrada é recusada. */
  gestorAtivo?: boolean;
}

/**
 * Quem está logado no dashboard.
 *
 * ⚠️ v10 — AGORA TODO MUNDO TEM `id`. Até a v9 este tipo tinha todos os campos
 * opcionais porque o Desenvolvedor era um objeto inventado na tela
 * (`{ email, full_name }`), sem linha no banco. Com o acesso técnico virando um
 * usuário real do Supabase, o `id` sempre existe — e o Meu Perfil deixou de
 * depender de uma exceção.
 */
export interface UsuarioSessao {
  id: string;
  email?: string;
  full_name?: string;
  user_metadata?: { full_name?: string } | null;
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

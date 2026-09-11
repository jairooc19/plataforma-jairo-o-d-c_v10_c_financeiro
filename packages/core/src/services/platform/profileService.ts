// Local: packages/core/src/services/platform/profileService.ts

import { supabase } from '../../lib/supabase';

/**
 * 👤 PROFILE SERVICE — O perfil do usuário em public.users (PJODC v10)
 * Local: packages/core/src/services/platform/profileService.ts
 *
 * Responsabilidade única: ler, completar, editar e apagar o perfil de QUEM ESTÁ
 * LOGADO. Não trata de sessão (authService), nem de empresas (tenantService).
 *
 * ⚠️ USA O CLIENTE ANON DE PROPÓSITO, e não o `supabaseAdmin`: estes métodos são
 * chamados de componentes React no navegador, onde o RLS é a proteção. As duas
 * policies que sustentam isto vivem no plataforma_01_schema.sql, seção 6.1:
 *   - SELECT "Acesso administrativo para triagem"
 *   - UPDATE "Usuários podem atualizar seu próprio perfil" (auth.uid() = id)
 * Trocar por supabaseAdmin aqui abriria a edição do perfil alheio.
 *
 * ⚠️ O nome da tabela no PostgREST é `users`, NUNCA `public.users`: o schema já
 * é o padrão da API. `.from('public.users')` devolve 404 de tabela inexistente.
 */

/** Campos que o usuário informa — o que o Google não entrega sozinho. */
export interface ProfileInput {
  full_name: string;
  planet: string;
  country: string;
  state: string;
  city: string;
}

/** Colunas do perfil devolvidas pela leitura. */
export interface UserProfile extends ProfileInput {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  auth_provider: string;
  profile_completed: boolean;
  created_at: string;
}

/**
 * Guarda de campo obrigatório. O banco aceitaria `state`/`city` em branco
 * (só `planet` e `country` são NOT NULL), então a exigência dos cinco campos
 * é decisão de produto — e por isso mora aqui, no Core, e não numa tela.
 */
const CAMPOS_OBRIGATORIOS: { chave: keyof ProfileInput; rotulo: string }[] = [
  { chave: 'full_name', rotulo: 'Nome completo' },
  { chave: 'planet',    rotulo: 'Planeta' },
  { chave: 'country',   rotulo: 'País' },
  { chave: 'state',     rotulo: 'Estado' },
  { chave: 'city',      rotulo: 'Cidade' },
];

function validarObrigatorios(data: Partial<ProfileInput>) {
  for (const { chave, rotulo } of CAMPOS_OBRIGATORIOS) {
    if (!data[chave]?.trim()) throw new Error(`${rotulo} é obrigatório.`);
  }
}

export const profileService = {
  /** 📖 Lê o perfil completo. */
  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(`Erro ao obter perfil: ${error.message}`);
    return data as UserProfile;
  },

  /**
   * ✅ O cadastro chegou ao fim?
   * Vai pela função do banco, e não por um SELECT da coluna: a função confere a
   * bandeira E os cinco campos juntos, então um perfil marcado como completo
   * mas com a cidade esvaziada depois volta a ser tratado como incompleto.
   */
  async isProfileCompleted(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_profile_completed', {
      p_user_id: userId,
    });

    if (error) throw new Error(`Erro ao verificar perfil: ${error.message}`);
    return data === true;
  },

  /**
   * 🏁 Fecha o cadastro do usuário Google (primeiro acesso).
   * Exige os cinco campos e levanta a bandeira `profile_completed`.
   */
  async completeProfile(userId: string, data: ProfileInput): Promise<UserProfile> {
    validarObrigatorios(data);

    const { data: result, error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name.trim(),
        planet: data.planet.trim(),
        country: data.country.trim(),
        state: data.state.trim(),
        city: data.city.trim(),
        profile_completed: true,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao completar perfil: ${error.message}`);
    return result as UserProfile;
  },

  /**
   * ✏️ Edição posterior do perfil.
   * Valida os mesmos cinco campos: quem já completou o cadastro não pode
   * desfazê-lo pela tela de edição, esvaziando a cidade e ficando num limbo em
   * que o portão da seção 5.8 o manda de volta para "Completar Cadastro".
   */
  async updateProfile(userId: string, data: ProfileInput): Promise<UserProfile> {
    validarObrigatorios(data);

    const { data: result, error } = await supabase
      .from('users')
      .update({
        full_name: data.full_name.trim(),
        planet: data.planet.trim(),
        country: data.country.trim(),
        state: data.state.trim(),
        city: data.city.trim(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`);
    return result as UserProfile;
  },

  /**
   * 💀 Apaga a conta em definitivo. Não há desfazer.
   *
   * A RPC é quem decide: ela compara `p_user_id` com `auth.uid()` e recusa
   * qualquer id que não seja o do próprio solicitante, e recusa também quem for
   * dono de empresa. Por isso o erro de negócio volta DENTRO do json
   * (`success: false`), e não como exceção do PostgREST — precisa ser lido.
   */
  async deleteAccountPermanently(userId: string): Promise<{ success: boolean; message?: string }> {
    const { data, error } = await supabase.rpc('delete_user_permanently', {
      p_user_id: userId,
    });

    if (error) throw new Error(`Erro ao apagar conta: ${error.message}`);
    if (data && data.success === false) throw new Error(data.error);

    return data;
  },
};

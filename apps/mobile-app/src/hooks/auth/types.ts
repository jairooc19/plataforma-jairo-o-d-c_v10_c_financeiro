import type { AuthFormData } from '../useAuthForm';
import type { PapelTriagem } from '../useTenantTriage';

/** Todas as telas que a guarita mobile conhece. Espelha o `ViewState` da web. */
export type ViewState =
  | 'menu' | 'access-options' | 'about' | 'contact'
  | 'login-owner' | 'login-dependent' | 'login-developer'
  | 'signup' | 'complete-profile' | 'select-tenant'
  | 'waiting-approval' | 'planet-blocked' | 'viewer-only';

export interface AuthMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

/**
 * 🧰 FERRAMENTAS COMPARTILHADAS PELOS FLUXOS DE AUTENTICAÇÃO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/auth/types.ts
 *
 * Os quatro fluxos (cadastro, senha, Google, completar perfil) são
 * responsabilidades separadas — cada um no seu arquivo, como manda a regra de
 * ouro do CLAUDE.md — mas todos precisam mexer nos mesmos quatro estados e
 * terminar na mesma triagem de empresas.
 *
 * Este contrato é o que eles recebem do orquestrador. Passar o pacote inteiro,
 * e não seis parâmetros soltos, evita que acrescentar um estado novo obrigue a
 * mudar a assinatura dos quatro arquivos de uma vez.
 */
export interface FluxoAuthCtx {
  formData: AuthFormData;
  setLoading: (valor: boolean) => void;
  setMessage: (mensagem: AuthMessage | null) => void;
  setView: (view: ViewState) => void;
  setCurrentUser: (usuario: { id: string; email: string } | null) => void;

  /** Decide o destino pós-login: entra, sala de espera ou seletor de empresa. */
  triar: (userId: string, papel: PapelTriagem) => Promise<'entrou' | 'sem-vinculos' | 'multiplas'>;

  /** Mostra a falha já traduzida para português. */
  falhar: (erro: unknown) => void;

  /** Resposta a "nenhum vínculo", que difere por papel. */
  tratarSemVinculos: (papel: PapelTriagem) => void;
}

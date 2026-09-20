import type { AuthFormData } from '../useAuthForm';
import type { PapelTriagem } from '../useTenantTriage';

/**
 * Todas as telas que a guarita mobile conhece. Espelha o `ViewState` da web.
 *
 * ⚠️ `waiting-team` ENTROU EM 20/09/2026, com a porta do Dependente. **São DUAS
 * salas de espera, e confundi-las faz a pessoa esperar pelo interlocutor errado
 * — ou seja, esperar para sempre:**
 *
 *   • `waiting-approval` → quem espera pelo PROPRIETÁRIO é o DESENVOLVEDOR, na
 *     triagem do Painel de Engenharia. A tela diz "estamos analisando", e é
 *     verdade.
 *   • `waiting-team` → quem espera pelo DEPENDENTE é o DONO DA EMPRESA, que
 *     precisa incluir o e-mail dele na equipe. O Desenvolvedor não vai fazer
 *     nada por ele, e mandá-lo para a tela acima seria dizer o contrário.
 */
export type ViewState =
  | 'menu' | 'access-options' | 'about' | 'contact'
  | 'login-owner' | 'login-dependent' | 'login-developer'
  | 'signup' | 'complete-profile' | 'select-tenant'
  | 'waiting-approval' | 'waiting-team' | 'planet-blocked' | 'viewer-only';

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

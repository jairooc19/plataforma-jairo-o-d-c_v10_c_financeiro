import { storageService } from './storageService';

/** Os dois papéis que a guarita oferece como LOGIN. "Apenas Veja" não é login. */
export type PapelDeAcesso = 'OWNER' | 'DEPENDENT';

/**
 * ⚠️ NOME ESTÁVEL. Trocá-lo não desloga ninguém (a sessão é outra chave), mas
 * faz todo mundo que estiver no meio do OAuth voltar ao padrão 'OWNER'.
 */
const CHAVE = 'pjodc_papel_de_acesso';

/**
 * 🎫 O PAPEL ESCOLHIDO NA GUARITA (PJODC v10)
 * Local: apps/mobile-app/src/services/papelDeAcessoService.ts
 *
 * ===========================================================================
 * ⚠️ POR QUE ISTO NÃO PODE SER ESTADO DE COMPONENTE, COMO É NA WEB
 * ===========================================================================
 * Na web o papel vive num `useState` (`papelDoAcesso`, no `useAuthLogic`), e
 * isso basta: o popup do Google abre e fecha DENTRO da mesma página, e o estado
 * nunca é destruído.
 *
 * No telemóvel o caminho é outro, e ele passa POR FORA do aplicativo: o botão
 * abre o navegador do sistema, o usuário autentica lá, e o retorno chega por
 * deep link. Entre a ida e a volta, o Android pode ter matado o aplicativo para
 * liberar memória — e aí:
 *
 *   • o estado do React não existe mais;
 *   • a pilha de navegação não existe mais (o `?papel=` da rota de login foi
 *     junto);
 *   • quem recebe a volta é `app/auth/google.tsx`, um endereço que o SISTEMA
 *     OPERACIONAL abre. A URL dele é escrita pelo Supabase
 *     (`plataformajairo://auth/google#access_token=…`) — **não há como
 *     acrescentar um parâmetro nosso a ela**.
 *
 * O cofre do aparelho é o único lugar que sobrevive a isso. Por isso o papel é
 * gravado no CLIQUE (antes de o navegador abrir) e lido na volta.
 *
 * ===========================================================================
 * ⚠️ ISTO NÃO É AUTORIZAÇÃO, E A DIFERENÇA É O ARQUIVO INTEIRO
 * ===========================================================================
 * O CLAUDE.md proíbe confiar no `SecureStore` como autorização, e com razão: o
 * cofre pertence a quem tem o aparelho. Esta chave **não autoriza nada**.
 *
 * Tudo o que ela decide é:
 *   1. qual consulta de triagem rodar (`getUserTenants` filtra por `role`);
 *   2. qual sala de espera mostrar quando não há vínculo nenhum.
 *
 * Quem é OWNER e quem é DEPENDENT está em `tenant_members`, escrito pelo dono
 * da empresa, e a RLS não pergunta qual botão a pessoa apertou. Gravar
 * 'OWNER' aqui à mão não dá empresa nenhuma a ninguém: a consulta volta vazia e
 * a pessoa cai na sala de espera. É o mesmo raciocínio do botão "VALORES + %"
 * do módulo — o cliente escolhe o que PEDE, o banco decide o que ENTREGA.
 *
 * 🔁 O PADRÃO É 'OWNER', e não é arbitrário: era o valor fixo no código até
 * 20/09/2026. Cofre vazio (primeira abertura, ou usuário que limpou os dados do
 * app) devolve exatamente o comportamento antigo, em vez de inventar um novo.
 */
export const papelDeAcessoService = {
  /** Grava a escolha. Chamado no CLIQUE, antes de o navegador abrir. */
  async guardar(papel: PapelDeAcesso): Promise<void> {
    await storageService.setItem(CHAVE, papel);
  },

  /**
   * Lê a escolha. Nunca devolve `null`: quem chama precisa de um papel para
   * consultar, e "não sei" não é uma consulta possível.
   */
  async ler(): Promise<PapelDeAcesso> {
    const bruto = await storageService.getItem(CHAVE);
    return bruto === 'DEPENDENT' ? 'DEPENDENT' : 'OWNER';
  },

  /** Esquece a escolha. Sai junto com a sessão, no logout. */
  async limpar(): Promise<void> {
    await storageService.removeItem(CHAVE);
  },
};

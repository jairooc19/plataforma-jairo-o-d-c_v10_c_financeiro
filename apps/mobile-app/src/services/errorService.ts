import { traduzirErroAuth } from '@/lib/authErrors';

/**
 * 🩺 TRADUÇÃO DE FALHAS PARA LINGUAGEM DE GENTE (PJODC v10)
 * Local: apps/mobile-app/src/services/errorService.ts
 *
 * Porta única entre "o que quebrou" e "o que o usuário lê". Cobre o que o
 * `lib/authErrors.ts` não cobre: falha de rede, tempo esgotado, RLS, PostgREST
 * e restrições do banco — categorias que nada tinham a ver com autenticação e
 * por isso chegavam à tela em inglês e em jargão.
 *
 * ⚠️ ELE NÃO SUBSTITUI O `authErrors.ts`: delega a ele os erros do GoTrue. São
 * dois níveis, não duas cópias — o mapa de autenticação continua sendo o dono
 * das mensagens de login, e este arquivo é quem decide se o erro é de
 * autenticação ou de outra natureza.
 *
 * 🎯 A REGRA QUE GOVERNA AS MENSAGENS: dizer o que fazer, não o que aconteceu.
 * "Sem conexão. Verifique sua internet e tente de novo." é acionável;
 * "Network request failed" não é — e ainda faz o usuário achar que o app
 * quebrou, quando o problema é o Wi-Fi dele.
 *
 * 🔍 O ERRO ORIGINAL NUNCA É DESCARTADO. `registrar()` o imprime inteiro no
 * console com a origem; só a mensagem traduzida vai para a tela. Engolir o erro
 * cru deixaria a próxima investigação sem nada para começar.
 *
 * 📌 DÍVIDA CONHECIDA, herdada do `authErrors.ts`: o lugar definitivo desta
 * lógica é o `@jairo/core` — a web tem os próprios mapas em
 * `auth/actions.ts` e em `googleAuthService.ts`. Traduzir erro é regra de
 * plataforma, não de tela. Enquanto não for unificado, quem acrescentar uma
 * tradução precisa lembrar dos três lugares.
 */

/** Categoria da falha. Decide a mensagem e se vale a pena tentar de novo. */
export type CategoriaErro =
  | 'rede'
  | 'autenticacao'
  | 'permissao'
  | 'nao-encontrado'
  | 'conflito'
  | 'desconhecido';

export interface ErroTratado {
  /** Texto pronto para exibir ao usuário, em português. */
  mensagem: string;
  categoria: CategoriaErro;
  /** Tentar de novo tem chance de resolver? Rede sim; permissão não. */
  podeTentarNovamente: boolean;
}

/** Trechos que identificam falha de transporte, em qualquer das camadas. */
const SINAIS_DE_REDE = [
  'network request failed',
  'failed to fetch',
  'timeout',
  'timed out',
  'econnrefused',
  'enotfound',
  'aborted',
];

/**
 * Códigos do PostgREST/PostgreSQL que chegam pelo supabase-js.
 * `42501` e `PGRST301` são o rosto do RLS negando a linha.
 */
const CODIGOS: Record<string, { mensagem: string; categoria: CategoriaErro }> = {
  '42501': {
    mensagem: 'Você não tem permissão para esta operação.',
    categoria: 'permissao',
  },
  PGRST301: {
    mensagem: 'Sua sessão expirou. Entre novamente.',
    categoria: 'autenticacao',
  },
  PGRST116: {
    mensagem: 'Registro não encontrado.',
    categoria: 'nao-encontrado',
  },
  '23505': {
    mensagem: 'Este registro já existe.',
    categoria: 'conflito',
  },
  '23503': {
    mensagem: 'Existe outro registro dependendo deste. Remova-o primeiro.',
    categoria: 'conflito',
  },
  '23502': {
    mensagem: 'Há um campo obrigatório em branco.',
    categoria: 'conflito',
  },
};

/** Extrai `message` e `code` de um erro de forma que não lance por sua vez. */
function dissecar(erro: unknown): { mensagem: string; codigo?: string } {
  if (typeof erro === 'string') return { mensagem: erro };

  if (erro && typeof erro === 'object') {
    const alvo = erro as { message?: unknown; code?: unknown };
    return {
      mensagem: typeof alvo.message === 'string' ? alvo.message : '',
      codigo: typeof alvo.code === 'string' ? alvo.code : undefined,
    };
  }

  return { mensagem: '' };
}

export const errorService = {
  /**
   * Traduz qualquer falha para uma mensagem exibível.
   *
   * A ordem das verificações importa: o código do banco é o sinal mais
   * específico e vem primeiro; a rede vem antes do resto porque uma falha de
   * transporte pode carregar qualquer texto; e a autenticação fica por último
   * porque o `traduzirErroAuth` devolve a mensagem original quando não conhece
   * o erro — se ele viesse antes, engoliria tudo.
   */
  tratar(erro: unknown): ErroTratado {
    const { mensagem, codigo } = dissecar(erro);

    if (codigo && CODIGOS[codigo]) {
      const conhecido = CODIGOS[codigo];
      return { ...conhecido, podeTentarNovamente: conhecido.categoria === 'rede' };
    }

    const texto = mensagem.toLowerCase();

    if (SINAIS_DE_REDE.some((sinal) => texto.includes(sinal))) {
      return {
        mensagem: 'Sem conexão. Verifique sua internet e tente de novo.',
        categoria: 'rede',
        podeTentarNovamente: true,
      };
    }

    if (!mensagem) {
      return {
        mensagem: 'Algo deu errado. Tente de novo em instantes.',
        categoria: 'desconhecido',
        podeTentarNovamente: true,
      };
    }

    const traduzida = traduzirErroAuth(mensagem);
    return {
      mensagem: traduzida,
      // Traduziu para algo diferente do original ⇒ era um erro de autenticação
      // que conhecemos, e repetir a mesma senha não vai resolver.
      categoria: traduzida !== mensagem ? 'autenticacao' : 'desconhecido',
      podeTentarNovamente: traduzida === mensagem,
    };
  },

  /** Atalho para quando só a frase interessa. */
  mensagem(erro: unknown): string {
    return this.tratar(erro).mensagem;
  },

  /**
   * Registra a falha com a sua origem, preservando o erro cru.
   * `origem` deve nomear o fluxo ('LOGIN', 'PERFIL', 'TRIAGEM') para que a
   * linha no console diga onde procurar sem depender do texto do erro.
   */
  registrar(origem: string, erro: unknown): void {
    console.error(`[${origem}]`, erro);
  },
};

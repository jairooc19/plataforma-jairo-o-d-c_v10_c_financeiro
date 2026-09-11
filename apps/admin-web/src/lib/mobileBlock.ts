/**
 * 📱 FONTE ÚNICA DO BLOQUEIO MÓVEL (PJODC v10)
 * Local: apps/admin-web/src/lib/mobileBlock.ts
 *
 * Três consumidores precisam concordar sobre o MESMO texto e a MESMA rota:
 * o overlay (`MobileBlocker`), a página de destino (`/mobile-blocked`) e o
 * middleware. Duas cópias da frase seria uma para ajustar e outra para
 * esquecer — o usuário leria mensagens diferentes conforme a porta de entrada.
 *
 * ⚠️ Só constantes e uma função pura vivem aqui: o middleware roda no Edge
 * Runtime e não pode importar nada que toque em `window`, Node ou React.
 */

/** Endereço da página de bloqueio. Usado como destino E como exceção nas guardas. */
export const ROTA_BLOQUEIO = "/mobile-blocked";

/** A frase exigida pelo requisito. Um único lugar para mudá-la. */
export const MENSAGEM_BLOQUEIO =
  "Este sistema web funciona apenas em telas maiores. Para usar em celular, baixe o app mobile.";

/** Endereço da política de privacidade. Exigido pela Google Play Console. */
export const ROTA_PRIVACIDADE = "/privacidade";

/**
 * Rotas que o overlay de largura NUNCA cobre.
 *
 * ⚠️ `/privacidade` ESTÁ AQUI POR EXIGÊNCIA DA PLAY STORE, e a omissão custaria
 * uma reprovação. O Google pede a URL da política de privacidade e **abre esse
 * link no celular** durante a revisão — se a cortina de "use em desktop"
 * aparecer por cima, o revisor conclui que a política não está acessível. A
 * política é o documento público do aplicativo MÓVEL: ela precisa se ler
 * justamente onde o app roda.
 *
 * `/mobile-blocked` está aqui porque aquela página JÁ É a mensagem de bloqueio.
 */
export const ROTAS_SEM_BLOQUEIO = [ROTA_BLOQUEIO, ROTA_PRIVACIDADE];

/** Prefixos de rota que o middleware bloqueia por user agent. */
export const ROTAS_PROTEGIDAS = ["/dashboard"];

const UA_MOVEL = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i;

/**
 * 🕵️ O user agent é de celular?
 *
 * ⚠️ `ipad` NÃO está na expressão de propósito. Tablet em paisagem tem largura
 * de sobra, e o requisito lista "tablet em modo paisagem" como uso válido —
 * barrá-lo no servidor tiraria do usuário uma opção que a própria mensagem
 * oferece. Quando o iPad estiver estreito demais, quem barra é o overlay,
 * que mede a largura real.
 *
 * Esta é a camada GROSSA da defesa: user agent se falsifica em dois cliques.
 * A camada que vale é o `MobileBlocker`, por largura de tela.
 */
export function isMobileUserAgent(userAgent: string | null): boolean {
  return !!userAgent && UA_MOVEL.test(userAgent);
}

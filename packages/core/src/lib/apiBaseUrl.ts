/**
 * 🌐 A URL BASE DAS API ROUTES DO ADMIN-WEB (PJODC v10)
 * Local: packages/core/src/lib/apiBaseUrl.ts
 *
 * Um arquivo, uma responsabilidade: responder "para qual host o Core manda as
 * chamadas HTTP?". Quem pergunta é o `adminApiService`, que faz as operações do
 * Painel de Engenharia — as que EXIGEM a service role e por isso não podem
 * acontecer no aparelho.
 *
 * ⛔ NÃO HÁ VALOR PADRÃO, E A AUSÊNCIA É ERRO. A tentação é cair num endereço de
 * produção quando a variável falta, como `authService.notifyAdminNewUser` ainda
 * faz (ele carrega um `https://…-v3.vercel.app` embutido, de uma versão que já
 * não é esta — está fora do escopo desta mudança, mas fica registrado). Para
 * NOTIFICAR, chutar o host é inofensivo: no máximo a notificação se perde. Aqui
 * não: `sincronizarEmpresas` CRIA E DESATIVA EMPRESAS. Um host errado significa
 * escrever no banco de outra implantação, em silêncio, e descobrir depois. Um
 * erro legível é infinitamente mais barato.
 *
 * ⚠️ `localhost` NO APARELHO É O PRÓPRIO APARELHO. É o engano clássico do
 * desenvolvimento mobile: `http://localhost:3000` funciona no navegador do PC e
 * falha no telemóvel com "Network request failed", porque o celular procura um
 * servidor nele mesmo. No aparelho o valor precisa ser o IP da máquina na rede
 * local (`http://192.168.x.x:3000`) ou a URL publicada. Por isso a checagem
 * abaixo não é genérica: ela nomeia o engano.
 */

/** Erro com mensagem já pronta para a tela — não é falha de rede, é de config. */
export class ApiBaseUrlAusenteError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ApiBaseUrlAusenteError';
  }
}

/**
 * Devolve a URL base sem barra no fim, ou lança com instrução de correção.
 *
 * @param exigirAlcancavel quando `true` (o padrão no aparelho), recusa
 *   `localhost`/`127.0.0.1`, que só funcionam quando o código roda na mesma
 *   máquina que o servidor.
 */
export function resolverApiBaseUrl(exigirAlcancavel = false): string {
  const bruta = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();

  if (!bruta) {
    throw new ApiBaseUrlAusenteError(
      'EXPO_PUBLIC_API_URL não está definida. Ela precisa apontar para o admin-web ' +
        '(ex.: http://192.168.1.3:3000 em desenvolvimento, ou a URL publicada).'
    );
  }

  const semBarra = bruta.replace(/\/+$/, '');

  if (exigirAlcancavel && /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(semBarra)) {
    throw new ApiBaseUrlAusenteError(
      `EXPO_PUBLIC_API_URL está em "${semBarra}", que no aparelho aponta para o próprio ` +
        'aparelho — não para o seu computador. Troque pelo IP da máquina na rede local ' +
        '(ex.: http://192.168.1.3:3000) ou pela URL publicada do admin-web.'
    );
  }

  return semBarra;
}

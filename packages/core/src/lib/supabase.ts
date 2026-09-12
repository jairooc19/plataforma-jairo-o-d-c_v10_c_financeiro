/**
 * 🔵 MOTOR DE COMUNICAÇÃO CENTRALIZADO (PJODC v10)
 * Local: packages/core/src/lib/supabase.ts
 *
 * Instância única do cliente PÚBLICO (anon), compartilhada pela web e pelo
 * aplicativo. Detecta o ambiente sem importar React Native — o que quebraria o
 * build da Vercel.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU NA v10: O CLIENTE DE CHAVE MESTRA SAIU DAQUI
 * ===========================================================================
 * Até a v9 este arquivo também exportava `supabaseAdmin`, o cliente de SERVICE
 * ROLE, que ignora a RLS. Ele alimentava seis rotas HTTP que NÃO PEDIAM
 * IDENTIFICAÇÃO NENHUMA: quem soubesse o endereço criava empresas, promovia
 * usuários e trocava as cores do sistema.
 *
 * A v10 trocou o desenho: as operações administrativas viraram funções
 * `admin_*` no banco, que conferem `is_superuser()` com a sessão de quem chama.
 * Com isso a chave mestra deixou de ser necessária na aplicação — e uma chave
 * que não existe no código não vaza.
 *
 * 🔑 SE UM DIA PRECISAR MESMO DA CHAVE MESTRA (importação em massa, rotina de
 * manutenção), crie o cliente NO ARQUIVO QUE PRECISA, no servidor, com a chave
 * lida de variável de ambiente sem o prefixo `NEXT_PUBLIC_`/`EXPO_PUBLIC_`.
 * Exportá-la daqui a deixa a um `import` de distância de qualquer tela.
 *
 * ===========================================================================
 * ⚠️ ESTE CLIENTE É PARA O NAVEGADOR E PARA O APARELHO — NÃO PARA O SERVIDOR
 * ===========================================================================
 * Ele é um singleton com `persistSession: true`: guarda em memória a sessão do
 * último login. Num servidor que atende várias pessoas, isso significa que uma
 * consulta feita depois pode rodar com a identidade de outro usuário. A
 * documentação do Supabase é direta: no servidor, crie um cliente NOVO a cada
 * requisição, porque senão "o usuário ficará logado como a pessoa errada".
 *
 * No `admin-web`, quem faz isso é o `@supabase/ssr` (`createServerClient`), já
 * usado no proxy, nas Server Actions e nas rotas de autenticação.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key';

/**
 * 🛡️ O PULO DO GATO: Custom Fetch Universal
 * Detectamos o ambiente de execução de forma agnóstica, sem importar
 * 'react-native'. Isso evita erros de build na Vercel enquanto mantém a
 * inteligência no Mobile.
 */
const customFetch: typeof fetch = (url, options) => {
  /**
   * Identificamos se estamos no Mobile (React Native) através do objeto
   * navigator. Esta propriedade é injetada pelo motor do Expo/RN e não existe
   * no Next.js Server.
   */
  const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

  // Clonamos as opções para evitar mutações colaterais
  const newOptions: RequestInit = { ...options };

  if (!isReactNative) {
    /**
     * AMBIENTE: WEB (Vercel / Next.js / Browser)
     * Aplicamos a 'Vacina Anti-Cache' para garantir que as consultas
     * ao banco de dados sempre retornem dados reais (essencial para o Admin).
     */
    (newOptions as { cache?: RequestCache }).cache = 'no-store';
  } else {
    /**
     * AMBIENTE: MOBILE (Android / iOS)
     * O motor nativo de fetch não suporta a propriedade 'cache'.
     * Removemos para evitar que o PostgREST receba uma URL corrompida.
     */
    delete (newOptions as { cache?: RequestCache }).cache;
  }

  return fetch(url, newOptions);
};

/**
 * CLIENTE PADRÃO (MORADOR) — RLS ativo.
 *
 * 🔄 RENOVAÇÃO DE TOKEN — explícito de propósito. Estes três já são o padrão do
 * supabase-js; escrevê-los aqui documenta que a plataforma DEPENDE deles e
 * impede que sumam num ajuste distraído:
 *  - autoRefreshToken: troca o access token pelo refresh token antes de expirar.
 *  - persistSession: a sessão sobrevive ao recarregar a página.
 *  - detectSessionInUrl: fecha o OAuth por redirecionamento quando o provedor
 *    devolve os tokens no fragmento da URL.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: customFetch,
  },
});

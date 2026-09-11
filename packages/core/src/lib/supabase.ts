/**
 * 🔵 MOTOR DE COMUNICAÇÃO CENTRALIZADO (PJODC CORE)
 * Local: packages/core/src/lib/supabase.ts
 * Evolução: Detecção Universal (Web/Mobile) sem dependências externas.
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

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SERVER_SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * 🛡️ O PULO DO GATO: Custom Fetch Universal
 * Detectamos o ambiente de execução de forma agnóstica, sem importar 'react-native'.
 * Isso evita erros de build na Vercel enquanto mantém a inteligência no Mobile.
 */
const customFetch: typeof fetch = (url, options) => {
  /**
   * Identificamos se estamos no Mobile (React Native) através do objeto navigator.
   * Esta propriedade é injetada pelo motor do Expo/RN e não existe no Next.js Server.
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
    (newOptions as any).cache = 'no-store';
  } else {
    /**
     * AMBIENTE: MOBILE (Android / iOS)
     * O motor nativo de fetch não suporta a propriedade 'cache'.
     * Removemos para evitar que o PostgREST receba uma URL corrompida.
     */
    delete (newOptions as any).cache;
  }

  return fetch(url, newOptions);
};

/**
 * 2. CLIENTE PADRÃO (MORADOR)
 * RLS Ativo.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  /**
   * 🔄 RENOVAÇÃO DE TOKEN — explícito de propósito.
   * Estes três já são o padrão do supabase-js; escrevê-los aqui documenta que a
   * plataforma DEPENDE deles e impede que sumam num ajuste distraído:
   *  - autoRefreshToken: troca o access token pelo refresh token antes de expirar.
   *    Sem ele o usuário é derrubado no meio do trabalho, em silêncio.
   *  - persistSession: a sessão sobrevive ao recarregar a página.
   *  - detectSessionInUrl: fecha o OAuth por redirecionamento quando o provedor
   *    devolve os tokens no fragmento da URL.
   */
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: customFetch,
  },
});

/**
 * 3. CLIENTE ADMINISTRATIVO (SÍNDICO/MESTRE)
 * Bypassa o RLS.
 */
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: customFetch,
      },
    })
  : null;
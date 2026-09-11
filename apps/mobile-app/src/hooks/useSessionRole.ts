import { useEffect, useState } from 'react';
import { storageService } from '@/services/storageService';
import type { UserRole } from '@/types';

interface PapelDaSessao {
  papel: UserRole | null;
  /** `true` enquanto o cofre ainda não respondeu. */
  carregando: boolean;
  /** Atalho: o Desenvolvedor não tem usuário no Supabase. */
  ehDesenvolvedor: boolean;
}

/**
 * 🎭 QUAL É O PAPEL DE QUEM ESTÁ LOGADO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useSessionRole.ts
 *
 * v9: [100% NATIVO — HOOK]
 * - Alimenta a decisão de quais abas nativas aparecem
 *
 * 🎯 EXISTE PARA A BARRA DE ABAS PODER SE ADAPTAR AO PAPEL. O `(tabs)/index.tsx`
 * já lia o papel para escolher entre o painel do cliente e o de engenharia, mas
 * lia dentro da tela — tarde demais para o layout, que decide quais gatilhos
 * desenhar ANTES de qualquer tela montar. Em vez de duplicar a leitura, ela
 * virou este hook.
 *
 * ⚠️ O PAPEL VEM DO COFRE LOCAL, NÃO DO BANCO — e isso é proposital, não
 * preguiça. O Desenvolvedor **não tem linha em `auth.users`**: a credencial dele
 * é fixa no Core (`authService.developerSignIn`) e nunca passa pelo GoTrue.
 * Perguntar o papel ao Supabase devolveria vazio para ele, e a aba de
 * engenharia sumiria justamente para quem ela existe.
 *
 * 🔒 ISTO NÃO É CONTROLE DE ACESSO. Esconder uma aba é conveniência de
 * interface; quem de fato protege dado é a RLS do Postgres. O cofre do aparelho
 * é gravável por quem tem o aparelho — tratar `papel` como autorização seria o
 * mesmo erro do `sessionStorage.dev_vip_access` documentado no CLAUDE.md.
 *
 * ⏳ `carregando` IMPORTA AQUI. Sem ele o layout desenharia a barra com o papel
 * `null` e a corrigiria um quadro depois: o usuário veria a aba de perfil
 * aparecer sozinha, do nada. Quem consome espera a leitura terminar.
 */
export function useSessionRole(): PapelDaSessao {
  const [papel, setPapel] = useState<UserRole | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function ler() {
      try {
        const { role } = await storageService.getSession();
        if (!cancelado) setPapel((role as UserRole | null) ?? null);
      } catch (e) {
        console.warn('[SESSION-ROLE] Falha ao ler o papel da sessão:', e);
        if (!cancelado) setPapel(null);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    ler();
    return () => {
      cancelado = true;
    };
  }, []);

  return { papel, carregando, ehDesenvolvedor: papel === 'DEVELOPER' };
}

import { useEffect, useState } from 'react';
import { storageService } from '@/services/storageService';
import type { UserRole } from '@/types';

interface PapelDaSessao {
  papel: UserRole | null;
  /** `true` enquanto o cofre ainda não respondeu. */
  carregando: boolean;
  /** Atalho para a composição da barra de abas. */
  ehDesenvolvedor: boolean;
}

/**
 * 🎭 QUAL É O PAPEL DE QUEM ESTÁ LOGADO (PJODC v10)
 * Local: apps/mobile-app/src/hooks/useSessionRole.ts
 *
 * 🎯 EXISTE PARA A BARRA DE ABAS PODER SE ADAPTAR AO PAPEL. O layout precisa
 * decidir quais gatilhos desenhar ANTES de qualquer tela montar, e uma consulta
 * de rede ali dentro atrasaria a primeira pintura do aplicativo.
 *
 * ⚠️ O VALOR VEM DO COFRE LOCAL — E, NA v10, ELE SÓ CHEGA LÁ DEPOIS DE O BANCO
 * CONFIRMAR. Até a v9 o papel `DEVELOPER` era gravado no cofre por uma
 * comparação de duas strings dentro do próprio aplicativo; agora ele é gravado
 * pelo `usePasswordLogin` somente quando a função `is_superuser()` do banco
 * responde que sim (ver aquele arquivo).
 *
 * 🔒 AINDA ASSIM, ISTO NÃO É CONTROLE DE ACESSO. O cofre do aparelho é gravável
 * por quem tem o aparelho: alguém que altere o valor consegue VER a tela do
 * Painel de Engenharia, e não consegue FAZER nada — todas as operações passam
 * pelas funções `admin_*`, que conferem o superusuário no servidor. Interface é
 * conveniência; quem protege dado é o banco.
 *
 * ⏳ `carregando` IMPORTA AQUI. Sem ele o layout desenharia a barra com o papel
 * `null` e a corrigiria um quadro depois: o usuário veria a aba de perfil
 * aparecer sozinha, do nada.
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

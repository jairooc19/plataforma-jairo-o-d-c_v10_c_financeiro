import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { rotuloDoMes, deslocarCompetencia } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * 📅 O SELETOR DE COMPETÊNCIA — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/SeletorDeCompetencia.tsx
 *
 * "◀  SETEMBRO / 2026  ▶"
 *
 * ===========================================================================
 * ⚠️ POR QUE NÃO É O MESMO COMPONENTE DO SITE
 * ===========================================================================
 * No site o seletor é um `<input type="month">`, que o navegador desenha. Em React
 * Native **não existe** esse elemento — não há `<input>` nenhum. E, mesmo que
 * houvesse, navegar mês a mês com o dedo é melhor: dois alvos grandes em vez de um
 * calendário que abre por cima da tela.
 *
 * ⚠️ QUEM CALCULA O MÊS É O CORE, NUNCA ESTE ARQUIVO. A tentação é escrever
 * `data.setMonth(data.getMonth() - 1)` — e isso devolve **3 de MARÇO** quando a data
 * de partida é 31 de março, sem erro nenhum, deixando o botão "mês anterior" com
 * aparência de quebrado. A `deslocarCompetencia` do `lib/datas.ts` ancora no dia 1 e
 * tem teste no `npm test` — é a MESMA função que o seletor do site usa.
 *
 * ♿ OS ALVOS TÊM 44pt, e não o tamanho da seta desenhada (24pt). 44 é o mínimo do
 * HIG da Apple e o que o dedo realmente acerta — alvo pequeno funciona com o rato e
 * falha no telefone, onde não há rato.
 */
export interface SeletorDeCompetenciaProps {
  /** A competência em vigor, no formato `YYYY-MM-01`. */
  competencia: string;
  aoEscolher: (competencia: string) => void;
  /** Bloqueia as setas enquanto a tela recarrega. */
  ocupado?: boolean;
}

function SeletorDeCompetenciaBase({
  competencia,
  aoEscolher,
  ocupado = false,
}: SeletorDeCompetenciaProps) {
  const voltar = useCallback(() => {
    aoEscolher(deslocarCompetencia(competencia, -1));
  }, [competencia, aoEscolher]);

  const avancar = useCallback(() => {
    aoEscolher(deslocarCompetencia(competencia, 1));
  }, [competencia, aoEscolher]);

  return (
    <View style={e.seletor}>
      <Pressable
        onPress={voltar}
        disabled={ocupado}
        style={e.seletorBotao}
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        hitSlop={8}
      >
        <IconeFin
          nome="anterior"
          tamanho={ICONE.medio}
          cor={ocupado ? BRAND.textFaint : BRAND.primary}
        />
      </Pressable>

      <Text style={e.seletorMes} numberOfLines={1}>
        {rotuloDoMes(competencia)}
      </Text>

      <Pressable
        onPress={avancar}
        disabled={ocupado}
        style={e.seletorBotao}
        accessibilityRole="button"
        accessibilityLabel="Mês seguinte"
        hitSlop={8}
      >
        <IconeFin
          nome="proximo"
          tamanho={ICONE.medio}
          cor={ocupado ? BRAND.textFaint : BRAND.primary}
        />
      </Pressable>
    </View>
  );
}

export const SeletorDeCompetencia = memo(SeletorDeCompetenciaBase);
export default SeletorDeCompetencia;

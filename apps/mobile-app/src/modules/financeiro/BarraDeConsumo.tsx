import React, { memo } from 'react';
import { View, Text } from 'react-native';
import {
  formatarBRL,
  faixaDeConsumo,
  larguraDaBarra,
  situacaoDaLinha,
  mostraValores,
  type LinhaDoDinheiro,
  type ModoDoDinheiro,
} from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { estilosFin as e } from './estilos';

/**
 * 📊 A BARRA DE CONSUMO — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/BarraDeConsumo.tsx
 *
 * O pedido original era *"de modo que o usuário só no olhar saberá que do valor
 * orçado já foi consumido X"*. A barra é isso: a cor responde antes de a pessoa ler
 * qualquer número.
 *
 * ⚠️ ELA NÃO DECIDE NADA. Cor, largura e a frase ao lado vêm de
 * `orcamentoRegras.ts`, no Core, com teste no `npm test` — as MESMAS funções que o
 * site usa. É isso que garante que o telefone e o monitor mostrem o mesmo número:
 * nenhum dos dois calcula.
 *
 * ⚠️ A REGRA QUE MAIS ERRA EM SILÊNCIO ESTÁ LÁ, NÃO AQUI: **nas RECEITAS o sentido
 * se inverte** — bater 100% é bom, e pintar de vermelho uma meta cumprida diria o
 * contrário do que aconteceu.
 *
 * 🎨 SEM SVG E SEM BIBLIOTECA DE GRÁFICO. A barra é uma `View` com largura em
 * percentagem dentro de outra com `overflow: 'hidden'`. Bastaria isso para o degrau
 * não instalar dependência nenhuma — e não instalar dependência é o que permite o
 * development build existente continuar servindo.
 *
 * 🎁 A MARCA DO RITMO DO MÊS é o risquinho vertical. Consumir 79% no dia 18 (quando
 * 60% do mês passou) é um recado; 79% no dia 30 é outro. A barra sozinha não conta
 * isso.
 */
export interface BarraDeConsumoProps {
  linha: LinhaDoDinheiro;
  /** Quanto do mês já passou, de 0 a 100. Vem de `ritmoDoMes()`, no Core. */
  ritmo: number;
  /** O modo de exibição em vigor. Ver `modoDinheiroRegras.ts`. */
  modo: ModoDoDinheiro;
  /** Sobrepõe o nome — usado na linha de TOTAL ("TOTAL DESPESAS"). */
  nome?: string;
}

function BarraDeConsumoBase({ linha, ritmo, modo, nome }: BarraDeConsumoProps) {
  const faixa = faixaDeConsumo(linha.consumo_percentual, linha.tipo);
  const largura = larguraDaBarra(linha.consumo_percentual);

  /**
   * ⚠️ A PERGUNTA É FEITA À FUNÇÃO DO CORE, e ela junta as DUAS condições: o modo
   * em vigor **e** o valor ter chegado do banco. Perguntar só ao modo faria quem
   * está bloqueado ver `0,00` em vez de `—` — e zero é um número, mentir dizendo
   * que o orçamento é zero seria pior do que não mostrar.
   */
  const comValores = mostraValores(modo, linha);

  /**
   * ⚠️ NO MODO "SÓ %" A FRASE É PEDIDA COM OS VALORES ZERADOS PARA NULO, e isso é
   * reaproveitamento deliberado do caminho que o Core já tem testado. A
   * `situacaoDaLinha` muda de redação quando `saldo_centavos` é nulo: em vez de
   * "SOBRAM 252,00" ela escreve "79% CONSUMIDO" / "ESTOUROU (112%)".
   *
   * Sem isto, a alternativa seria ESCONDER a frase no modo percentual — e aí quem
   * escolheu ver só o percentual perderia o aviso de estouro, que é a informação
   * mais útil da linha. Passando nulo, ele mantém o aviso e não vê número nenhum.
   *
   * ⚠️ E NOTE QUE ISTO NÃO É "ESCONDER DADO". Para quem o banco bloqueou, os valores
   * já chegaram nulos; aqui o nulo é só a forma de pedir a outra redação a quem tem
   * os valores em mãos por direito.
   */
  const situacao = situacaoDaLinha(
    comValores
      ? linha
      : { ...linha, orcado_centavos: null, realizado_centavos: null, saldo_centavos: null },
    (c) => formatarBRL(c),
  );

  const cor =
    faixa === 'VERDE' ? BRAND.success : faixa === 'AMBAR' ? BRAND.warning : BRAND.error;

  return (
    <View>
      <View style={e.barraTopo}>
        <Text style={e.barraNome} numberOfLines={2}>
          {nome ?? linha.nome}
        </Text>

        <Text style={e.barraValores} numberOfLines={2}>
          {comValores
            ? `${
                linha.orcado_centavos !== null
                  ? `ORÇADO ${formatarBRL(linha.orcado_centavos)} · `
                  : ''
              }REALIZADO ${formatarBRL(linha.realizado_centavos ?? 0)}`
            : 'SOMENTE O PERCENTUAL'}
        </Text>
      </View>

      <View style={e.barraLinha}>
        <View style={e.calha}>
          <View style={[e.preenchimento, { width: `${largura}%`, backgroundColor: cor }]} />

          {/* A marca do ritmo só faz sentido onde HÁ orçamento. */}
          {linha.bloco !== 'FORA' && ritmo > 0 && ritmo < 100 && (
            <View style={[e.marcaRitmo, { left: `${ritmo}%` }]} />
          )}
        </View>

        <Text style={[e.percentual, { color: cor }]}>
          {linha.consumo_percentual === null ? '—' : `${linha.consumo_percentual}%`}
        </Text>
      </View>

      <Text style={[e.situacao, { color: situacao.destaque ? cor : BRAND.textFaint }]}>
        {situacao.texto}
      </Text>
    </View>
  );
}

export const BarraDeConsumo = memo(BarraDeConsumoBase);
export default BarraDeConsumo;

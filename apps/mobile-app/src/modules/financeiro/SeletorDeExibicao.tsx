import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  rotuloDoModo,
  MODOS_DO_DINHEIRO,
  type ExibicaoDoDinheiro,
  type ModoDoDinheiro,
} from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * 🔀 O SELETOR "VALORES + %" × "SÓ %" (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/SeletorDeExibicao.tsx
 *
 * ===========================================================================
 * ⚠️ ELE SUBSTITUIU UM BOTÃO ÚNICO, E A TROCA FOI PAGA COM UM DEFEITO RELATADO
 * ===========================================================================
 * Até 19/09/2026 isto era **um botão só**, que anunciava o DESTINO do toque:
 * com os valores à vista, ele dizia "SÓ %". O argumento — escrito no código — era
 * que o estado atual já estava à vista, nos próprios números.
 *
 * **O argumento não sobreviveu ao primeiro uso real.** O dono do projeto leu
 * "SÓ %" como *"estou em SÓ %"*, viu os valores ao lado e relatou como defeito.
 * É a leitura natural: num botão, um substantivo descreve o estado; para ordenar,
 * seria preciso um verbo ("OCULTAR OS VALORES").
 *
 * ⚠️ E A CORREÇÃO NÃO FOI TROCAR A PALAVRA. Um botão de um estado com dois
 * sentidos possíveis continua ambíguo — só muda quem se confunde. Com as **duas
 * posições à vista** não há o que deduzir: a que está preenchida é a que vale.
 * É o mesmo motivo de um interruptor de duas teclas não precisar de manual.
 *
 * ===========================================================================
 * ⚠️ ELE NÃO GUARDA SEGREDO NENHUM — É POR ISSO QUE PODE EXISTIR
 * ===========================================================================
 * Quando o Proprietário marca "só percentual" para um Dependente, os valores
 * **não são enviados pelo banco** (`fin_dinheiro_do_periodo` devolve NULO). Mesmo
 * que alguém adultere o aplicativo, o que aparece é `—`.
 *
 *   • ESCONDER O QUE JÁ CHEGOU  → CONFORTO de quem olha. É o que isto faz.
 *   • NÃO ENVIAR O QUE NÃO PODE → SEGURANÇA, e mora no banco.
 *
 * ⚠️ TRAVADO, O SELETOR CONTINUA VISÍVEL — com a posição "SÓ %" marcada, a outra
 * apagada, e o motivo escrito ao lado. Escondê-lo faria a pessoa concluir que a
 * função não existe na conta dela; mostrá-lo sem explicação faria ela tocar e achar
 * que o aplicativo travou.
 *
 * ⚠️ QUEM DECIDE NÃO É ESTE ARQUIVO. `exibicao` vem de `exibicaoDoDinheiro()`, no
 * Core, com testes — inclusive os que provam que uma escolha "VALORES" gravada no
 * cofre do aparelho NÃO vale para quem está bloqueado.
 */
export interface SeletorDeExibicaoProps {
  exibicao: ExibicaoDoDinheiro;
  aoEscolher: (modo: ModoDoDinheiro) => void;
}

function SeletorDeExibicaoBase({ exibicao, aoEscolher }: SeletorDeExibicaoProps) {
  const travado = !exibicao.podeAlternar;

  return (
    <View style={e.seletorModo} accessibilityRole="radiogroup">
      {MODOS_DO_DINHEIRO.map((modo) => {
        const ativa = exibicao.modo === modo;

        /**
         * ⚠️ TRAVADO, A POSIÇÃO INATIVA NÃO RESPONDE AO TOQUE — mas continua
         * LEGÍVEL, e não apagada a ponto de sumir. Quem está bloqueado precisa ver
         * que a outra posição existe para entender o que a frase ao lado explica.
         */
        const inerte = travado && !ativa;

        return (
          <Pressable
            key={modo}
            onPress={() => aoEscolher(modo)}
            disabled={travado}
            style={[e.posicaoModo, ativa && (travado ? e.posicaoModoTravada : e.posicaoModoAtiva)]}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativa, disabled: travado }}
            accessibilityLabel={rotuloDoModo(modo)}
            accessibilityHint={travado ? (exibicao.motivo ?? undefined) : undefined}
          >
            <IconeFin
              nome={modo === 'VALORES' ? 'ver' : 'ocultar'}
              tamanho={ICONE.mini}
              cor={
                inerte
                  ? BRAND.textFaint
                  : ativa
                    ? travado
                      ? BRAND.textMuted
                      : BRAND.primary
                    : BRAND.textMuted
              }
            />
            <Text
              style={[
                e.posicaoModoTexto,
                ativa && !travado && e.posicaoModoTextoAtiva,
                inerte && e.posicaoModoTextoInerte,
              ]}
            >
              {rotuloDoModo(modo)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const SeletorDeExibicao = memo(SeletorDeExibicaoBase);
export default SeletorDeExibicao;

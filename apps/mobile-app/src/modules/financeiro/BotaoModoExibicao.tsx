import React, { memo } from 'react';
import { Text, Pressable } from 'react-native';
import { rotuloDoModo, type ExibicaoDoDinheiro } from '@jairo/core';

import { BRAND } from '@/constants/Colors';
import { ICONE } from '@/constants/Spacing';
import IconeFin from './IconeFin';
import { estilosFin as e } from './estilos';

/**
 * 🔀 O BOTÃO "VALORES + %" × "SÓ %" (PJODC v10)
 * Local: apps/mobile-app/src/modules/financeiro/BotaoModoExibicao.tsx
 *
 * Pedido do dono do projeto em 19/09/2026. Ele serve ao Proprietário **e** ao
 * Dependente, e não conflita com o bloqueio que o Dependente já pode ter.
 *
 * ===========================================================================
 * ⚠️ ESTE BOTÃO NÃO GUARDA SEGREDO NENHUM — E É POR ISSO QUE ELE PODE EXISTIR
 * ===========================================================================
 * Quando o Proprietário marca "só percentual" para um Dependente, os valores
 * **não são enviados pelo banco**: `fin_dinheiro_do_periodo` devolve
 * `orcado_centavos`, `realizado_centavos` e `saldo_centavos` em NULO. Mesmo que
 * alguém adultere o aplicativo e force o modo VALORES, o que aparece é `—`.
 *
 * Então há duas coisas diferentes acontecendo, e elas não competem:
 *   • ESCONDER O QUE JÁ CHEGOU  → é CONFORTO de quem está olhando (mostrar o ecrã
 *     a alguém ao lado, por exemplo). É o que este botão faz.
 *   • NÃO ENVIAR O QUE NÃO PODE → é SEGURANÇA, e mora no banco. Já estava lá.
 *
 * ⚠️ E É POR ISSO QUE ISTO NÃO FERE a proibição *"nunca implementar 'este usuário
 * vê menos' filtrando na TELA"*. Aquela proibição trata de esconder do usuário o
 * que OUTRA pessoa decidiu que ele não pode ver — e isso continua sendo feito no
 * banco. Aqui é o próprio usuário escolhendo, para si, como quer ler o que já é
 * dele.
 *
 * ⚠️ QUANDO ESTÁ BLOQUEADO, O BOTÃO CONTINUA VISÍVEL — desligado, cinza, e com o
 * motivo escrito ao lado. Esconder o botão faria a pessoa concluir que a função não
 * existe no aplicativo dela; mostrá-lo sem explicação faria ela tocar e achar que o
 * aplicativo travou. A terceira via é a única honesta: mostrar, desligar, explicar.
 *
 * ⚠️ QUEM DECIDE NÃO É ESTE ARQUIVO. `exibicao` vem de `exibicaoDoDinheiro()`, no
 * Core, com 13 testes — inclusive os três que provam que uma escolha "VALORES"
 * gravada no cofre do aparelho NÃO vale para quem está bloqueado.
 */
export interface BotaoModoExibicaoProps {
  exibicao: ExibicaoDoDinheiro;
  aoAlternar: () => void;
}

function BotaoModoExibicaoBase({ exibicao, aoAlternar }: BotaoModoExibicaoProps) {
  const travado = !exibicao.podeAlternar;

  /**
   * O ícone anuncia o DESTINO, como o rótulo: estando em VALORES, o toque OCULTA.
   * Travado, o olho fechado é o estado permanente — e é a verdade.
   */
  const icone = travado ? 'ocultar' : exibicao.modo === 'VALORES' ? 'ocultar' : 'ver';

  return (
    <Pressable
      onPress={aoAlternar}
      disabled={travado}
      style={[e.botaoModo, travado && e.botaoModoTravado]}
      accessibilityRole="button"
      accessibilityState={{ disabled: travado }}
      accessibilityLabel={
        travado
          ? 'Exibição travada em somente percentual pelo proprietário da empresa'
          : `Trocar a exibição para ${rotuloDoModo(exibicao.modo)}`
      }
      accessibilityHint={travado ? (exibicao.motivo ?? undefined) : undefined}
      hitSlop={6}
    >
      <IconeFin
        nome={icone}
        tamanho={ICONE.pequeno}
        cor={travado ? BRAND.textMuted : BRAND.primary}
      />

      {/*
        Travado, o botão não pode anunciar um destino que não existe: ele passa a
        nomear o ESTADO ("SÓ %"), que é o que de fato vale para sempre nesta conta.
      */}
      <Text style={[e.botaoModoTexto, travado && e.botaoModoTextoTravado]}>
        {travado ? 'SÓ %' : rotuloDoModo(exibicao.modo)}
      </Text>
    </Pressable>
  );
}

export const BotaoModoExibicao = memo(BotaoModoExibicaoBase);
export default BotaoModoExibicao;

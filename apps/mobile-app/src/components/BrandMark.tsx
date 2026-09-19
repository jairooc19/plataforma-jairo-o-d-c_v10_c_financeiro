import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import LogoPJODC from '@/components/LogoPJODC';
import { BRAND } from '@/constants/Colors';
import { TAMANHO, PESO } from '@/constants/Typography';
import { ESPACO, DURACAO } from '@/constants/Spacing';

export interface BrandMarkProps {
  /** Nome exibido ao lado do símbolo. Padrão: o nome da plataforma. */
  titulo?: string;
  /**
   * A linha de baixo. Hoje é o rótulo dos módulos plugados, vindo do registro do
   * Core (`rotuloDosModulosInstalados()`) — nunca um texto escrito à mão numa tela.
   */
  subtitulo?: string | null;
  /** Sem animação de entrada — use quando a marca não abre a tela. */
  estatica?: boolean;
}

/**
 * O lado da logo no lockup. 48pt é a medida de alvo de toque do projeto, e é o
 * que sobra de largura para o nome caber numa linha num telefone de 360dp.
 */
const TAMANHO_DA_LOGO = 48;

/**
 * 🔷 A MARCA (PJODC v10)
 * Local: apps/mobile-app/src/components/BrandMark.tsx
 *
 * Símbolo e nome NA MESMA LINHA, alinhados à esquerda; abaixo, o rótulo dos
 * módulos desta instalação.
 *
 * ===========================================================================
 * ⚠️ O QUE MUDOU EM 19/09/2026 (degrau 08), E POR QUÊ
 * ===========================================================================
 * Até aqui a marca era uma pilha CENTRADA de três andares: símbolo de 72pt, nome
 * embaixo, e uma legenda ("Ecossistema de gestão multi-empresa."). Por pedido do
 * dono do projeto ela virou um **lockup horizontal** — símbolo à esquerda, nome ao
 * lado, na mesma linha — e a legenda saiu.
 *
 * 📐 O SÍMBOLO ENCOLHEU DE 72pt PARA 48pt, E NÃO FOI ESCOLHA ESTÉTICA. Num lockup
 * horizontal ele divide a largura com o nome: num telefone de 360dp sobram ~280dp
 * para o texto depois do símbolo e da folga. Mantidos os 72pt, sobrariam ~256dp, e
 * "PLATAFORMA JAIRO O D C" em maiúsculas não caberia numa linha — quebraria em
 * duas, desalinhando o nome em relação ao símbolo. 48pt é a medida de alvo de
 * toque do projeto (`ALVO.medio`), o que mantém a marca coerente com o resto.
 *
 * 🔠 O NOME VAI EM MAIÚSCULAS, mas quem o entrega já em maiúsculas é quem o passa —
 * aqui só se aplica `letterSpacing`. Maiúscula por `textTransform` no React Native
 * tem comportamento desigual entre plataformas quando o texto quebra de linha.
 *
 * 🇧🇷 O SÍMBOLO É A LOGO PJODC DESDE 19/09/2026 — o disco com a bandeira do Brasil
 * e o anel de letras, a MESMA do site. Até então era um quadrado azul com um ícone
 * de raio dentro, um espaço reservado da v9 à espera do logotipo de verdade. Ele
 * chegou, e entrou exatamente onde aquele comentário dizia que entraria: dentro de
 * `<BrandMark />`, sem nenhuma tela mudar.
 *
 * ⚠️ O DESENHO NÃO MORA AQUI, e sim em `components/LogoPJODC.tsx`. Duas telas já o
 * usam (a guarita e o cabeçalho das abas), e uma cópia em cada uma divergiria da
 * outra no primeiro ajuste.
 *
 * ⚠️ NÃO É O ÍCONE DO APLICATIVO. Aquele vive em `src/assets/images/icon.png` e é
 * desenhado pelo sistema operacional na tela inicial — trocar um não troca o outro.
 *
 * ⚠️ O SUBTÍTULO NÃO É ESCRITO AQUI. Ele chega por prop, e quem o produz é o
 * registro de módulos do Core. Escrever "MÓDULO: CONTROLE FINANCEIRO" neste arquivo
 * seria pôr o nome de um módulo dentro da plataforma — o verificador de LEGO
 * acusaria, e a frase viraria mentira no dia em que o módulo fosse desplugado.
 */
function BrandMarkBase({
  titulo = 'PLATAFORMA JAIRO O D C',
  subtitulo,
  estatica = false,
}: BrandMarkProps) {
  /**
   * A marca inteira entra como UM bloco, e não elemento a elemento. Escalonar
   * símbolo, nome e subtítulo separadamente faria a identidade do produto se
   * montar em pedaços diante do usuário — o efeito é de tela carregando devagar,
   * não de tela viva.
   */
  const entrada = estatica ? undefined : FadeInDown.duration(DURACAO.media);

  return (
    <Animated.View entering={entrada} style={estilos.raiz}>
      {/* O lockup: símbolo + nome, na mesma linha. */}
      <View style={estilos.linha}>
        <LogoPJODC tamanho={TAMANHO_DA_LOGO} />

        {/*
          ⚠️ `flexShrink: 1` E DUAS LINHAS DE FOLGA. Sem o encolhimento, um título
          mais longo (o white-label permite trocá-lo) empurraria o texto para fora
          da tela em vez de quebrar — e em React Native o que sai da tela não
          aparece cortado com reticências: simplesmente desaparece.
        */}
        <Text style={estilos.nome} numberOfLines={2}>
          {titulo}
        </Text>
      </View>

      {!!subtitulo && (
        <Text style={estilos.subtitulo} numberOfLines={2}>
          {subtitulo}
        </Text>
      )}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  /**
   * ⚠️ `alignItems: 'flex-start'` É O QUE CUMPRE "ALINHADO À ESQUERDA". Sem ele, o
   * bloco herdaria o alinhamento do container (a guarita centra o conteúdo) e o
   * lockup voltaria ao meio da tela, que é exatamente o que saiu de cena.
   */
  raiz: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: ESPACO.xxl,
  },

  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO.md,
    alignSelf: 'stretch',
  },

  /**
   * ⚠️ NÃO USA `TIPOGRAFIA.titulo` (26pt). Aquele degrau foi desenhado para título
   * de tela em pilha centrada; num lockup horizontal de 48pt ele briga com o
   * símbolo pela largura e quebra em duas linhas no telefone estreito. 20pt com
   * `letterSpacing` positivo é a medida que faz um nome em maiúsculas ler-se como
   * marca, e não como frase.
   */
  nome: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: PESO.forte,
    color: BRAND.text,
    letterSpacing: 0.6,
  },

  subtitulo: {
    marginTop: ESPACO.sm,
    fontSize: TAMANHO.dica,
    lineHeight: 16,
    fontWeight: PESO.medio,
    color: BRAND.primary,
    letterSpacing: 1.2,
  },
});

export const BrandMark = memo(BrandMarkBase);
export default BrandMark;

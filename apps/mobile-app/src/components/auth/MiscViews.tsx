import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Card from '@/components/card/Card';
import Button from '@/components/button/Button';
import Icon, { type NomeIcone } from '@/components/icon/Icon';
import { BRAND, PLATFORM } from '@/constants/Colors';
import { ESPACO, ICONE } from '@/constants/Spacing';
import { authStyles } from './authStyles';

export type MiscView = 'about' | 'contact' | 'viewer-only' | 'waiting-approval' | 'planet-blocked';

interface Props {
  view: MiscView;
  pegadinha?: boolean;
  onAction?: (acao: 'fix-planet' | 'show-joke') => void;
  onBack: () => void;
}

/**
 * Título, corpo, ícone e cor de cada tela informativa — mesmos textos da web.
 *
 * 🎨 A COR NÃO É DECORAÇÃO: ela diz o TOM da mensagem antes de o texto ser lido.
 * Azul informa, âmbar faz esperar, vermelho barra. Um usuário que chega em
 * "Aguardando Triagem" precisa entender em meio segundo que não errou nada —
 * e o âmbar diz isso antes do parágrafo.
 */
const CONTEUDO: Record<MiscView, { titulo: string; corpo: string; icone: NomeIcone; cor: string }> = {
  about: {
    titulo: 'Sobre',
    icone: 'Informacao',
    cor: BRAND.primary,
    corpo: 'A Plataforma JAIRO O D C é um ecossistema de alta performance.',
  },
  contact: {
    titulo: 'Contato',
    icone: 'Suporte',
    cor: BRAND.primary,
    corpo: 'Entre em contato com suporte@jairo.com.br',
  },
  'viewer-only': {
    titulo: 'Aviso',
    icone: 'Ver',
    cor: BRAND.warning,
    corpo: 'Aguardando liberação do Desenvolvedor Master.',
  },
  'waiting-approval': {
    titulo: 'Aguardando Triagem',
    icone: 'Relogio',
    cor: BRAND.warning,
    corpo:
      'Seu cadastro foi recebido com sucesso. O Desenvolvedor Master está analisando sua solicitação.',
  },
  'planet-blocked': {
    titulo: 'Acesso Restrito',
    icone: 'Planeta',
    cor: BRAND.error,
    corpo:
      'No momento o sistema não atende a usuários de outros planetas. Envie uma solicitação para o desenvolvedor.',
  },
};

/**
 * ℹ️ VIEW: TELAS INFORMATIVAS E AUXILIARES — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/MiscViews.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - Ícone vetorial sobre tinta circular, no lugar do emoji de 40pt
 *
 * Espelho do `MiscViews.tsx` da web. Cinco telas num arquivo só porque são a
 * mesma coisa com textos diferentes: um cartão, um título, um parágrafo e um
 * botão de volta. Cinco arquivos seriam cinco cópias da mesma moldura.
 *
 * 🙂 OS EMOJI SAÍRAM — MENOS UM, E A EXCEÇÃO É O PONTO. ℹ️ 💬 👁 ⌛ 👽 eram
 * desenhados pela fonte de emoji do APARELHO: coloridos e volumosos no iOS,
 * de outro traço no Android, e sem aceitar cor em nenhum dos dois. Viraram
 * ícones do registro, que herdam o tom da mensagem.
 *
 * 🤣 O EMOJI DA PEGADINHA FICOU, de propósito. Ali ele não é um ícone de
 * interface — é o conteúdo da piada, e um ícone vetorial de "rosto rindo"
 * simplesmente não tem graça. Emoji como CONTEÚDO é uso legítimo; emoji como
 * ícone de sistema é o que esta refatoração removeu.
 *
 * 🎭 A EXCEÇÃO DE FLUXO É `planet-blocked`, que tem estado próprio (a pegadinha)
 * — e é a única razão de este componente receber `onAction` além de `onBack`.
 */
function MiscViews({ view, pegadinha, onAction, onBack }: Props) {
  const { titulo, corpo, icone, cor } = CONTEUDO[view];

  const mostrarPiada = useCallback(() => onAction?.('show-joke'), [onAction]);
  const voltarParaTerra = useCallback(() => onAction?.('fix-planet'), [onAction]);

  // 👽 Bloqueio planetário: fluxo próprio, com desfecho em piada.
  if (view === 'planet-blocked') {
    return (
      <Card>
        {pegadinha ? (
          <>
            <Text style={estilos.emoji}>🤣</Text>
            <Text style={authStyles.titulo}>
              Você caiu na pegadinha da{'\n'}PLATAFORMA JAIRO O D C
            </Text>
            <Button
              title="Ok, entendi!"
              size="large"
              onPress={voltarParaTerra}
              style={authStyles.espacoBotao}
            />
          </>
        ) : (
          <>
            <Simbolo icone={icone} cor={cor} />
            <Text style={authStyles.titulo}>{titulo}</Text>
            <Text style={authStyles.subtitulo}>{corpo}</Text>

            <Button
              title="Enviar solicitação"
              size="large"
              onPress={mostrarPiada}
              style={authStyles.espacoBotao}
            />
            <Button
              title="Voltar e selecionar Terra"
              variant="ghost"
              onPress={voltarParaTerra}
              style={estilos.espacoCurto}
            />
          </>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <Simbolo icone={icone} cor={cor} />
      <Text style={authStyles.titulo}>{titulo}</Text>
      <Text style={authStyles.subtitulo}>{corpo}</Text>

      <Button
        title={view === 'waiting-approval' ? 'Sair' : 'Voltar ao início'}
        variant="ghost"
        icon={view === 'waiting-approval' ? 'Sair' : 'Voltar'}
        onPress={onBack}
        style={authStyles.espacoBotao}
      />
    </Card>
  );
}

/**
 * O ícone da mensagem, num círculo da própria cor a 12%.
 *
 * ⚠️ NO NÍVEL DO MÓDULO, não dentro do `MiscViews`. Componente declarado dentro
 * de outro vira um tipo novo a cada render e força a remontagem da subárvore —
 * proibição do CLAUDE.md, e aqui ela custaria uma reanimação de entrada a cada
 * atualização do pai.
 */
const Simbolo = memo(function Simbolo({ icone, cor }: { icone: NomeIcone; cor: string }) {
  return (
    <View style={[estilos.simbolo, { backgroundColor: `${cor}1f` }]}>
      <Icon name={icone} size={ICONE.grande} color={cor} strokeWidth={1.75} />
    </View>
  );
});

const estilos = StyleSheet.create({
  simbolo: {
    width: 72,
    height: 72,
    borderRadius: PLATFORM.radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: ESPACO.lg,
  },

  /** Só a pegadinha. Ver a nota no cabeçalho sobre emoji como conteúdo. */
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: ESPACO.md,
  },

  espacoCurto: { marginTop: ESPACO.sm },
});

export default memo(MiscViews);

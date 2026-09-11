import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Card from '@/components/card/Card';
import MenuCard from '@/components/card/MenuCard';
import Button from '@/components/button/Button';
import { ESPACO, DURACAO } from '@/constants/Spacing';

interface Props {
  onSelectAccess: () => void;
  onHelpToggle: () => void;
  showHelpOptions: boolean;
  onNavigate: (destino: 'contact' | 'about' | 'login-developer') => void;
}

/**
 * 🏠 VIEW: MENU PRINCIPAL — MOBILE (PJODC v10)
 * Local: apps/mobile-app/src/components/auth/MainMenuView.tsx
 *
 * v9: [100% NATIVO — REFATORAÇÃO DE DESIGN]
 * - O nome da plataforma subiu para a marca (`BrandMark`, no `AuthScreen`)
 * - As opções de ajuda viraram cartões de menu, não linhas com emoji
 *
 * Espelho do `MainMenuView.tsx` da web, com o mesmo conteúdo e a mesma ausência.
 *
 * 🚫 SEM BOTÃO DE CADASTRO (v7): o Proprietário entra por Google, e a própria
 * autenticação cria a conta no primeiro acesso — um formulário de cadastro seria
 * uma segunda porta para o mesmo lugar. A tela `signup` continua existindo (o
 * Dependente precisa dela), mas não é anunciada aqui, exatamente como na web.
 *
 * 🏷️ O CARTÃO NÃO REPETE MAIS O NOME DA PLATAFORMA. Ele o imprimia em versal no
 * topo, e agora a marca inteira — símbolo, nome e legenda — abre a tela acima
 * dele. Manter os dois deixaria "Plataforma Jairo O D C" escrito duas vezes na
 * mesma dobra, o que lê-se como erro de montagem.
 *
 * 💬 O MENU DE AJUDA ABRE PARA BAIXO, sem sobreposição flutuante: numa tela de
 * telemóvel não há espaço lateral para um dropdown ancorado, e empurrar o
 * conteúdo é mais previsível do que cobri-lo.
 *
 * 🙂 OS EMOJI SAÍRAM DAS OPÇÕES DE AJUDA. 💬 e ℹ️ vinham da fonte de emoji do
 * APARELHO — coloridos e volumosos no iOS, de outro traço no Android, e sem
 * aceitar cor em nenhum dos dois. Agora são ícones vetoriais do registro, que
 * herdam a cor da marca e casam com o resto da interface.
 */
function MainMenuView({ onSelectAccess, onHelpToggle, showHelpOptions, onNavigate }: Props) {
  // Estáveis entre renders: sem isto, cada re-render daria props novas ao
  // `MenuCard` memoizado e o `memo` dele não economizaria nada.
  const irParaContato = useCallback(() => onNavigate('contact'), [onNavigate]);
  const irParaSobre = useCallback(() => onNavigate('about'), [onNavigate]);
  const irParaEngenharia = useCallback(() => onNavigate('login-developer'), [onNavigate]);

  return (
    <View>
      <Card>
        <Button
          title="Entrar"
          size="large"
          icon="Avancar"
          iconPosition="right"
          onPress={onSelectAccess}
          testID="btn-entrar"
        />

        <Button
          title={showHelpOptions ? 'Fechar ajuda' : 'Ajuda'}
          variant="secondary"
          icon="Ajuda"
          onPress={onHelpToggle}
          style={estilos.espacoCurto}
          accessibilityLabel={showHelpOptions ? 'Fechar opções de ajuda' : 'Abrir opções de ajuda'}
          testID="btn-ajuda"
        />
      </Card>

      {/*
        🎞️ AS OPÇÕES ENTRAM ESCALONADAS, mas só na abertura. `FadeInDown` é
        declarativo: ele dispara quando o nó é MONTADO, e como o bloco inteiro é
        montado e desmontado pelo `showHelpOptions`, cada abertura reanima sem
        que exista um `useEffect` ou um estado de animação em lugar nenhum.
      */}
      {showHelpOptions && (
        <Animated.View entering={FadeInDown.duration(DURACAO.rapida)} style={estilos.ajuda}>
          <MenuCard
            icon="Suporte"
            title="Fale Conosco"
            description="Enviar uma mensagem à equipe."
            onPress={irParaContato}
            indice={0}
            testID="ajuda-contato"
          />
          <MenuCard
            icon="Informacao"
            title="Sobre a Plataforma"
            description="O que é e para que serve."
            onPress={irParaSobre}
            indice={1}
            testID="ajuda-sobre"
          />
        </Animated.View>
      )}

      {/*
        🔧 O PAINEL DE ENGENHARIA É `ghost` E FICA FORA DO CARTÃO, de propósito.
        Ele não é uma opção para o usuário comum — é a porta de serviço. Dentro
        do cartão, ao lado de "Entrar", pareceria uma terceira forma de acesso
        legítima; solto no rodapé, lê-se como o que é.
      */}
      <Button
        title="Painel de Engenharia"
        variant="ghost"
        size="small"
        onPress={irParaEngenharia}
        style={estilos.engenharia}
        testID="btn-engenharia"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  espacoCurto: { marginTop: ESPACO.md },
  ajuda: { marginTop: ESPACO.md, gap: ESPACO.md },
  engenharia: { marginTop: ESPACO.xl },
});

export default memo(MainMenuView);

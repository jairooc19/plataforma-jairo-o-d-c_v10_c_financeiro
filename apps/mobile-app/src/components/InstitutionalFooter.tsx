import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { APP_VERSION } from '@jairo/core';

import { BRAND, BRAND_DARK } from '@/constants/Colors';
import { TIPOGRAFIA } from '@/constants/Typography';
import { ESPACO } from '@/constants/Spacing';

/**
 * 📜 RODAPÉ INSTITUCIONAL (PJODC v10)
 * Local: apps/mobile-app/src/components/InstitutionalFooter.tsx
 *
 * v9: [100% NATIVO — COMPONENTE]
 * - Saiu de baixo da barra de abas para dentro do conteúdo das telas
 * - Corpo e folgas passaram a vir dos tokens, não de literais
 *
 * 🔀 POR QUE ELE SE MUDOU. Até a v9 este bloco ficava EMPILHADO ABAIXO do
 * `<Tabs>`, dentro do `(tabs)/_layout.tsx`. Aquilo funcionava porque a barra de
 * abas era desenhada por nós, em JavaScript: bastava pôr outro `View` embaixo. A
 * barra nativa não admite isso — o `UITabBarController` e o
 * `BottomNavigationView` são donos da borda inferior da tela, e o sistema não
 * empresta aquele espaço a ninguém. Tentar sobrepor um rodapé ali daria uma
 * faixa flutuando por cima da barra, brigando com o inset do aparelho.
 *
 * 🧩 POR QUE UM COMPONENTE, e não um trecho copiado em cada tela: ele aparece no
 * painel e no perfil, e vai aparecer em toda aba futura. A atribuição de
 * direitos autorais e a versão do app são a mesma frase em todo lugar —
 * duplicá-la garantiria que um dia duas telas mostrassem versões diferentes.
 *
 * 🎨 O FUNDO É O DA TELA, E NÃO MAIS BRANCO COM LINHA EM CIMA. A borda superior
 * desenhava um degrau entre o conteúdo e o rodapé — mais uma linha horizontal
 * numa tela que já tem a barra de abas logo abaixo, e duas faixas separadoras
 * empilhadas leem-se como sujeira. Sem fundo próprio, o rodapé se dissolve no
 * conteúdo, que é o peso visual que uma nota de direitos autorais merece.
 *
 * 🌑 `escuro` EXISTE PORQUE O RODAPÉ FECHA AS DUAS ABAS, e uma delas é o Painel
 * de Engenharia — a única tela de fundo escuro da plataforma. Com o rodapé
 * assumindo a cor do fundo (ver acima), um valor fixo produziria uma faixa clara
 * atravessada sob o painel escuro, exatamente na borda da tela. Não é um modo
 * escuro do app; ver a nota sobre `BRAND_DARK` em `constants/Colors.ts`.
 *
 * ⚠️ NÃO PAGUE O INSET INFERIOR AQUI. Quem cuida da área segura embaixo é a
 * barra nativa, que já reserva o espaço do indicador de gestos. Somar
 * `insets.bottom` neste rodapé abriria uma faixa vazia entre ele e a barra.
 */
export default function InstitutionalFooter({ escuro = false }: { escuro?: boolean }) {
  const paleta = escuro ? ESCURO : CLARO;

  return (
    <View style={[estilos.rodape, { backgroundColor: paleta.fundo }]}>
      <Text style={[estilos.texto, { color: paleta.texto }]}>
        © 2026. Todos os direitos reservados para Jairo Oliveira da Cunha.
      </Text>
      <Text style={[estilos.versao, { color: paleta.versao }]}>Versão: {APP_VERSION}</Text>
    </View>
  );
}

const CLARO = {
  fundo: BRAND.background,
  texto: BRAND.textFaint,
  versao: BRAND.textFaint,
};

const ESCURO = {
  fundo: BRAND_DARK.background,
  texto: BRAND_DARK.textFaint,
  versao: BRAND_DARK.textGhost,
};

const estilos = StyleSheet.create({
  rodape: {
    paddingVertical: ESPACO.md,
    paddingHorizontal: ESPACO.lg,
    alignItems: 'center',
  },
  texto: {
    ...TIPOGRAFIA.dica,
    fontSize: 10,
    textAlign: 'center',
  },
  versao: {
    ...TIPOGRAFIA.dica,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
});

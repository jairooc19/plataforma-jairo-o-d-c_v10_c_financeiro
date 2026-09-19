import React, { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';

export interface LogoPJODCProps {
  /** Lado do quadrado do desenho, em pt. Padrão: 48. */
  tamanho?: number;
  /**
   * Cor do disco de fundo, atrás da bandeira e sob o anel de letras.
   *
   * ⚠️ O PADRÃO É BRANCO PORQUE É ASSIM NO SITE, e num cartão branco ele
   * desaparece de propósito — a marca "recorta" o fundo. Sobre o cinza da tela
   * (`BRAND.background`, `#f5f5f5`) o disco branco fica visível, discreto, que é
   * o efeito que o site tem sobre a barra colorida do cabeçalho.
   */
  fundo?: string;
}

/**
 * 🔷 A LOGO PJODC (PJODC v10)
 * Local: apps/mobile-app/src/components/LogoPJODC.tsx
 *
 * Um disco com a **bandeira do Brasil** ao centro e o anel de letras
 * **"PJODC-"** repetido em volta.
 *
 * ===========================================================================
 * ⚠️ ELA É A MESMA DO SITE, TRAÇO POR TRAÇO — E TEM DE CONTINUAR SENDO
 * ===========================================================================
 * O original é o `LogoIcon` de `apps/admin-web/src/app/layout.tsx`. Todas as
 * medidas abaixo foram copiadas de lá sem arredondar: o `viewBox` de 100×100, o
 * disco de raio 30, o trilho circular de raio 25, a bandeira em x=38/y=42 com
 * 24×16, o losango de quatro pontos, o círculo azul de raio 4, o corpo 4 e o
 * `textLength` de 157.1 (que é o perímetro do trilho: 2·π·25 ≈ 157,08).
 *
 * **Se um dia a logo do site mudar, este arquivo muda junto.** Duas versões da
 * mesma marca divergem em silêncio, e ninguém repara até alguém pôr o telefone
 * ao lado do monitor.
 *
 * ⚠️ `textLength` + `lengthAdjust="spacingAndGlyphs"` É O QUE FECHA O ANEL.
 * Sem eles, as 14 repetições de "PJODC-" ocupam o comprimento natural da fonte —
 * que não é o perímetro do círculo — e sobra (ou falta) letra no fecho, deixando
 * uma emenda visível. Com eles, o texto é esticado/comprimido para caber exato.
 * O `react-native-svg` suporta as duas props (`TextSpecificProps`), o que foi
 * conferido no pacote instalado antes de escrever isto.
 *
 * ⚠️ NÃO É O ÍCONE DO APLICATIVO. Aquele vive em `src/assets/images/icon.png` e
 * é desenhado pelo sistema operacional na tela inicial — trocar um não troca o
 * outro.
 *
 * 📦 SEM DEPENDÊNCIA NOVA: `react-native-svg@15.15.4` já estava no
 * `package.json` e, portanto, já ia no APK. Este é o primeiro arquivo do
 * aplicativo a usá-lo — o módulo nativo não precisa de build novo por causa
 * disto.
 */
function LogoPJODCBase({ tamanho = 48, fundo = '#ffffff' }: LogoPJODCProps) {
  /**
   * 14 repetições de "PJODC-" = 84 caracteres ao longo do anel. O número vem do
   * site; mudá-lo muda o tamanho aparente das letras, porque o `textLength`
   * mantém o comprimento total fixo e reparte o espaço entre elas.
   */
  const textoCircular = 'PJODC-'.repeat(14);

  /** O perímetro do trilho de raio 25: 2 · π · 25 ≈ 157,08. */
  const perimetro = 157.1;

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
      <Defs>
        {/*
          O trilho FECHADO por onde o texto corre: dois semicírculos de raio 25
          emendados. Um `<Circle>` não serve de trilho — `TextPath` precisa de um
          `<Path>` com `d`.
        */}
        <Path
          id="trilhoFechado25"
          d="M 50, 50 m -25, 0 a 25,25 0 1,1 50,0 a 25,25 0 1,1 -50,0"
        />
      </Defs>

      <Circle cx="50" cy="50" r="30" fill={fundo} />

      {/* 🇧🇷 A bandeira: retângulo verde, losango amarelo, disco azul. */}
      <G>
        <Rect x="38" y="42" width="24" height="16" fill="#009b3a" />
        <Polygon points="50,43.5 60.5,50 50,56.5 39.5,50" fill="#fedf00" />
        <Circle cx="50" cy="50" r="4" fill="#002776" />
      </G>

      <SvgText
        fontFamily="monospace"
        fontSize="4"
        fontWeight="bold"
        fill="#42A5F5"
        textLength={perimetro}
        lengthAdjust="spacingAndGlyphs"
      >
        <TextPath href="#trilhoFechado25">{textoCircular}</TextPath>
      </SvgText>
    </Svg>
  );
}

export const LogoPJODC = memo(LogoPJODCBase);
export default LogoPJODC;

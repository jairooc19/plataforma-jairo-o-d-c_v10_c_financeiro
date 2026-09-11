import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * 🌐 CASCA HTML — SÓ NA WEB (PJODC v10)
 * Local: apps/mobile-app/app/+html.tsx
 *
 * Só é usada pela renderização estática do `expo start --web`. O corpo desta
 * função roda em Node, na hora do build: não há DOM nem API de navegador aqui.
 * No iOS e no Android o arquivo é inteiramente ignorado.
 *
 * ⚠️ AS CORES SÃO CSS CRU, e por isso são o ÚNICO lugar do app onde um
 * hexadecimal literal é inevitável: este bloco é uma string injetada no `<head>`
 * antes de qualquer JavaScript rodar — importar `constants/Colors.ts` aqui não
 * ajudaria, porque o objetivo é justamente pintar o fundo ANTES de o bundle
 * carregar. Os valores abaixo são os mesmos de `BRAND.background` e
 * `BRAND_DARK.background`; mudá-los lá exige mudá-los aqui.
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Desativa a rolagem do <body> na web, para que o ScrollView se comporte
          como no nativo. Sem isto haveria duas áreas roláveis concorrentes.
        */}
        <ScrollViewStyleReset />

        {/* Evita o piscar de fundo branco antes de o tema carregar. */}
        <style dangerouslySetInnerHTML={{ __html: fundoResponsivo }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * Espelha `BRAND.background` (claro) e `BRAND_DARK.background` (escuro).
 *
 * ⚠️ ESTES DOIS VALORES SÃO CÓPIAS MANUAIS, e precisam ser atualizados junto com
 * `constants/Colors.ts`. Não dá para importar os tokens aqui: este bloco é
 * injetado como CSS cru no `<head>` do documento, ANTES de o pacote JavaScript
 * ser avaliado — é justamente essa antecedência que evita o piscar de fundo
 * branco. Uma importação de módulo chegaria tarde demais para cumprir a função.
 */
const fundoResponsivo = `
body {
  background-color: #f5f5f5;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #121212;
  }
}`;

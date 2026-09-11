"use client";

import { useState, useEffect } from "react";

/** Abaixo disto a tela é considerada celular. É o breakpoint `md` do Tailwind. */
export const LARGURA_MINIMA_PX = 768;

/**
 * 📱 A TELA É DE CELULAR? (PJODC v10)
 * Local: apps/admin-web/src/hooks/useIsMobile.ts
 *
 * Responde por LARGURA REAL da janela, não por user agent: quem abre o
 * navegador em meia tela num desktop também não cabe no layout, e um tablet
 * em paisagem cabe. O user agent mente sobre as duas coisas.
 *
 * 🛡️ NASCE `false` DE PROPÓSITO. No servidor não existe `window`, então o HTML
 * é renderizado como "não é celular". Se o estado inicial fosse calculado, a
 * primeira renderização do cliente divergiria da do servidor e o React
 * acusaria erro de hidratação. O efeito corrige o valor logo após montar —
 * antes de qualquer pintura visível.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const verificar = () => setIsMobile(window.innerWidth < LARGURA_MINIMA_PX);

    verificar();
    window.addEventListener("resize", verificar);
    return () => window.removeEventListener("resize", verificar);
  }, []);

  return isMobile;
}

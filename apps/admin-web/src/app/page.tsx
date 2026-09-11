"use client";

import { useEffect } from "react";
import { telemetry, ANALYTICS_EVENTS, ANALYTICS_PROPERTIES } from "@jairo/core";
import AuthInterface from "@/components/AuthInterface";

/**
 * 🏠 PÁGINA INICIAL (HOME) - PLATAFORMA JAIRO O D C v4
 * Este componente atua como a Landing Page e porta de entrada do sistema.
 * Implementa a captura manual de visualização para usuários anônimos.
 */
export default function Home() {
  
  useEffect(() => {
    // 🕵️ SENSORE DE ANÔNIMO: Captura o acesso inicial à Landing Page
    // Usamos o 'window.location' para carimbar o caminho exato da URL.
    telemetry.capture(ANALYTICS_EVENTS.VIEW_LANDING_PAGE, {
      [ANALYTICS_PROPERTIES.PAGE_PATH]: window.location.pathname,
      [ANALYTICS_PROPERTIES.ORIGIN_SECTION]: 'landing_page_entry'
    });
  }, []);

  return <AuthInterface />;
}
/**
 * 📡 TELEMETRIA LOCAL - PLATAFORMA JAIRO O D C v4
 *
 * Responsabilidade: Registrar eventos de fluxo do usuário SEM qualquer provedor externo.
 * A v4 removeu o PostHog; esta camada preserva o dicionário de eventos do Core
 * (eventNames / propertyNames) e grava tudo apenas no console do ambiente atual.
 *
 * Nada sai da máquina: não há fetch, cookie, localStorage nem chave de API.
 */

type TelemetryProps = Record<string, unknown>;

/** Prefixo padrão para facilitar o filtro nos logs do navegador/servidor. */
const TAG = "[TELEMETRIA]";

/** Contexto acumulado da sessão corrente (usuário e empresa ativa). */
let identity: { id: string | null; props: TelemetryProps } = { id: null, props: {} };
let groupContext: TelemetryProps = {};

export const telemetry = {
  /** Registra a ocorrência de um evento de negócio. */
  capture(event: string, props: TelemetryProps = {}) {
    console.debug(TAG, event, { ...groupContext, ...props, actor: identity.id });
  },

  /** Vincula os próximos eventos a um usuário identificado. */
  identify(id: string, props: TelemetryProps = {}) {
    identity = { id, props };
    console.debug(TAG, "identify", { id, ...props });
  },

  /** Vincula os próximos eventos a um agrupamento (ex: tenant). */
  group(type: string, id: string, props: TelemetryProps = {}) {
    groupContext = { [`${type}_id`]: id, ...props };
    console.debug(TAG, "group", { type, id, ...props });
  },

  /** Limpa o contexto acumulado (usado no logout). */
  reset() {
    identity = { id: null, props: {} };
    groupContext = {};
    console.debug(TAG, "reset");
  },
};

import type { ProviderConfig, ProviderId } from "./types";

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "unknown_provider" | "disabled_provider",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export const PROVIDERS = {
  interpark: {
    id: "interpark",
    name: "Interpark",
    targetUrl: "https://ticket.interpark.com/",
    enabled: true,
  },
  yes24: {
    id: "yes24",
    name: "YES24",
    targetUrl: "https://ticket.yes24.com/",
    enabled: true,
  },
  ticketlink: {
    id: "ticketlink",
    name: "Ticketlink",
    targetUrl: "https://www.ticketlink.co.kr/",
    enabled: true,
  },
  melon: {
    id: "melon",
    name: "Melon Ticket",
    targetUrl: "https://ticket.melon.com/",
    enabled: true,
  },
  weverse: {
    id: "weverse",
    name: "Weverse",
    targetUrl: "https://ticket.weverse.io/",
    enabled: true,
  },
} satisfies Record<ProviderId, ProviderConfig>;

export function isProviderId(value: string): value is ProviderId {
  return Object.hasOwn(PROVIDERS, value);
}

export function listProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}

export function getProvider(id: string): ProviderConfig {
  if (!isProviderId(id)) {
    throw new ProviderError(`Unknown provider: ${id}`, "unknown_provider");
  }

  const provider = PROVIDERS[id];
  if (!provider.enabled) {
    throw new ProviderError(`Provider is disabled: ${id}`, "disabled_provider");
  }

  return provider;
}

export function getProviderFromRegistry(
  registry: Record<string, ProviderConfig>,
  id: string,
): ProviderConfig {
  const provider = registry[id];
  if (!provider) {
    throw new ProviderError(`Unknown provider: ${id}`, "unknown_provider");
  }
  if (!provider.enabled) {
    throw new ProviderError(`Provider is disabled: ${id}`, "disabled_provider");
  }
  return provider;
}

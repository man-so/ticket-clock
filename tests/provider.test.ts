import assert from "node:assert/strict";
import test from "node:test";
import { getProvider, getProviderFromRegistry, ProviderError } from "../lib/providers/registry";
import type { ProviderConfig } from "../lib/providers/types";

test("provider registry returns a valid provider", () => {
  const provider = getProvider("interpark");
  assert.equal(provider.id, "interpark");
  assert.equal(provider.targetUrl, "https://ticket.interpark.com/");
});

test("provider registry rejects an unknown provider", () => {
  assert.throws(() => getProvider("unknown"), ProviderError);
});

test("provider registry rejects a disabled provider", () => {
  const registry: Record<string, ProviderConfig> = {
    interpark: {
      id: "interpark",
      name: "Interpark",
      targetUrl: "https://ticket.interpark.com/",
      enabled: false,
    },
  };

  assert.throws(
    () => getProviderFromRegistry(registry, "interpark"),
    /Provider is disabled/,
  );
});

class ProviderBoundaryError extends Error {
  constructor(message = "Private inference is not configured") {
    super(message);
    this.name = "ProviderBoundaryError";
    this.code = "PRIVATE_PROVIDER_NOT_APPROVED";
  }
}

class UnavailableProvider {
  async respond() {
    throw new ProviderBoundaryError();
  }

  async review() {
    throw new ProviderBoundaryError();
  }
}

class FixtureProvider {
  constructor(responder) {
    this.responder = responder;
  }

  async respond(context) {
    return this.responder("turn", context);
  }

  async review(context) {
    return this.responder("review", context);
  }
}

function createProvider({ env = process.env, fixtureResponder } = {}) {
  const approved = env.DIALOGUE_MODEL_PROVIDER_APPROVED === "true";
  const provider = env.DIALOGUE_MODEL_PROVIDER;
  if (!approved) return new UnavailableProvider();
  if (provider === "fixture" && env.NODE_ENV === "test" && typeof fixtureResponder === "function") {
    return new FixtureProvider(fixtureResponder);
  }
  // Chay approved the boundary on 2026-08-20: private corpus material may be sent
  // to the Anthropic API. Still gated behind BOTH the approval flag and an explicit
  // provider name, so no single misconfigured variable can start transmitting.
  if (provider === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) return new UnavailableProvider();
    // Required lazily: the SDK is only a dependency of this path, and the rest of
    // the site must keep working if it is not installed.
    const { createAnthropicProvider } = require("./anthropic-provider");
    return createAnthropicProvider({ env });
  }
  return new UnavailableProvider();
}

module.exports = {
  FixtureProvider,
  ProviderBoundaryError,
  UnavailableProvider,
  createProvider
};

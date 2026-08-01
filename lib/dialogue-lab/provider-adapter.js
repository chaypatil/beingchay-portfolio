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
  // No external provider is implemented until Chay approves its retention and
  // processing boundary. An env flag alone cannot silently enable transmission.
  return new UnavailableProvider();
}

module.exports = {
  FixtureProvider,
  ProviderBoundaryError,
  UnavailableProvider,
  createProvider
};

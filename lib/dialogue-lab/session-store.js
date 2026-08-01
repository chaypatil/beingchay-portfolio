const { randomUUID } = require("node:crypto");

class SessionStoreBoundaryError extends Error {
  constructor(message = "Private session storage is not configured") {
    super(message);
    this.name = "SessionStoreBoundaryError";
    this.code = "PRIVATE_SESSION_STORE_NOT_APPROVED";
  }
}

class UnavailableSessionStore {
  async create() { throw new SessionStoreBoundaryError(); }
  async get() { throw new SessionStoreBoundaryError(); }
  async save() { throw new SessionStoreBoundaryError(); }
}

class MemorySessionStore {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
    this.sessions = new Map();
  }

  async create({ mode = "listen" } = {}) {
    const now = this.clock().toISOString();
    const session = {
      id:randomUUID(),
      mode,
      createdAt:now,
      updatedAt:now,
      messages:[],
      observations:[],
      askedQuestions:[],
      proposals:[],
      endedAt:null
    };
    this.sessions.set(session.id, structuredClone(session));
    return structuredClone(session);
  }

  async get(id) {
    const session = this.sessions.get(id);
    return session ? structuredClone(session) : null;
  }

  async save(session) {
    session.updatedAt = this.clock().toISOString();
    this.sessions.set(session.id, structuredClone(session));
    return structuredClone(session);
  }
}

function createSessionStore({ env = process.env, memoryStore } = {}) {
  if (env.DIALOGUE_SESSION_STORE_APPROVED !== "true") return new UnavailableSessionStore();
  if (env.DIALOGUE_SESSION_STORE === "memory" && env.NODE_ENV === "test" && memoryStore) return memoryStore;
  // Durable production storage requires an explicitly approved encrypted store,
  // retention window and deletion policy. None is assumed here.
  return new UnavailableSessionStore();
}

module.exports = {
  MemorySessionStore,
  SessionStoreBoundaryError,
  UnavailableSessionStore,
  createSessionStore
};

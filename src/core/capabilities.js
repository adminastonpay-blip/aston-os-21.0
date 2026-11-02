// Presence checks only. Never expose binding values, secrets, IDs, or credentials.
export function getRuntimeCapabilities(env = {}) {
  return {
    d1: Boolean(env.DB),
    d1_backup: Boolean(env.DB_BACKUP),
    kv: Boolean(env.CACHE),
    r2: Boolean(env.MEDIA),
    ai: Boolean(env.AI),
    vectorize: Boolean(env.VECTORIZE),
    queue: Boolean(env.JOBS),
    session_do: Boolean(env.ASTON_SESSION),
    rate_limiter_do: Boolean(env.ASTON_RATE_LIMITER),
    ledger_lock_do: Boolean(env.ASTON_LEDGER_LOCK),
    agent_do: Boolean(env.ASTON_AGENT)
  };
}

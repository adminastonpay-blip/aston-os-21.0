import { fingerprintDecisionEvent, validateDecisionEvent } from "./decision-event.js";

export async function createChainedDecisionEvent(event, previousEventHash = null) {
  const validation = validateDecisionEvent(event);
  if (!validation.valid) throw new TypeError(validation.errors.join(","));
  if (previousEventHash !== null &&
      (typeof previousEventHash !== "string" || !/^[a-f0-9]{64}$/.test(previousEventHash))) {
    throw new TypeError("invalid_previous_event_hash");
  }
  const chained = { ...event, previousEventHash };
  const eventHash = await fingerprintDecisionEvent(chained);
  return { ...chained, eventHash };
}

export async function verifyDecisionEventChain(events) {
  if (!Array.isArray(events)) return { valid: false, verifiedCount: 0, error: "events_array_required" };
  let previousEventHash = null;
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    if (!event || event.previousEventHash !== previousEventHash ||
        typeof event.eventHash !== "string" || !/^[a-f0-9]{64}$/.test(event.eventHash)) {
      return { valid: false, verifiedCount: index, error: "chain_link_mismatch", failedIndex: index };
    }
    const { eventHash, ...payload } = event;
    let expected;
    try { expected = await fingerprintDecisionEvent(payload); }
    catch { return { valid: false, verifiedCount: index, error: "invalid_event", failedIndex: index }; }
    if (expected !== eventHash) {
      return { valid: false, verifiedCount: index, error: "event_hash_mismatch", failedIndex: index };
    }
    previousEventHash = eventHash;
  }
  return { valid: true, verifiedCount: events.length, headHash: previousEventHash };
}

// This detects content/link changes in the supplied sequence; it cannot prevent a privileged
// storage operator from truncating the whole chain. Periodically anchor the head externally.

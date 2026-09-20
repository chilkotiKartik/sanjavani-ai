import type { ConversationEngine, ConversationMemory } from '@sanjeevani/ai';
import type { ClientLocation, TurnRequest, TurnResponse } from '@sanjeevani/types';

/**
 * Triage that keeps working when the network does not.
 *
 * ## Why this exists
 *
 * The people this app is for are disproportionately on patchy connections — and the
 * moment you most need to know whether something is an emergency is not a moment to
 * discover that the server is unreachable. The safety rules have no dependency on the
 * network: they are deterministic TypeScript over a lexicon. So they can run here.
 *
 * ## It is the same engine, not a copy
 *
 * This loads `ConversationEngine` — the identical class the API runs — with the
 * deterministic provider and a facility finder backed by the bundled directory. There
 * is no second implementation of the rules to drift out of step with the first.
 * Whatever the server would have decided about urgency, this decides too.
 *
 * ## Hospitals, offline
 *
 * The verified directory is bundled with the app and ranked here by the same function
 * the server uses — same weights, same hard filters, so an emergency still never
 * returns a clinic or a facility known to be closed.
 *
 * This matters more than it sounds. Triage that correctly says "go to an emergency
 * department today" and then cannot name one has answered the easy half of the
 * question. Every result is flagged `facilities_offline` so the UI can say it is a
 * snapshot rather than a live search — the one thing worse than no hospital list is a
 * stale one presented as current.
 *
 * ## What is honestly lost offline
 *
 * - **Live hospital search.** Only the curated regional set, and only what was verified
 *   on a recorded date. Outside that region this returns nothing rather than guessing.
 * - **Natural phrasing.** Replies come from the localised templates. No model is called.
 * - **History.** Nothing is persisted server-side, so the turn does not appear in
 *   History. The response is marked `persistence_unavailable`, the same flag the server
 *   uses when its own database is unreachable.
 *
 * What is *not* lost: language detection, symptom extraction, the emergency circuit
 * breaker, follow-up questions, triage and every warning sign. The emergency numbers
 * are bundled client-side already, so a full emergency screen works with no network at
 * all.
 */

/**
 * Loaded on demand and kept, so the cost is paid once and never on the critical path.
 * The types are imported statically (erased at build time); only the implementation is
 * pulled in dynamically.
 */
let enginePromise: Promise<{ engine: ConversationEngine; freshMemory: () => ConversationMemory }> | null = null;

/**
 * Where the engine should look for hospitals on this turn. Set immediately before each
 * call and read by the finder below.
 *
 * A module-level value rather than a constructor argument because the engine is built
 * once and reused, while location changes per turn. Safe because `offlineTurn` awaits
 * the whole turn before returning, so two turns never interleave here.
 */
let currentOrigin: ClientLocation | null = null;

/** True when the last turn's hospital list came from the bundled snapshot. */
let usedBundledDirectory = false;

async function load() {
  const [{ ConversationEngine, DeterministicProvider, newConversationMemory }, { findOfflineFacilities }] = await Promise.all([
    import('@sanjeevani/ai'),
    import('@sanjeevani/maps/offline'),
  ]);

  const engine = new ConversationEngine({
    llm: new DeterministicProvider(),
    facilities: {
      async find(query) {
        usedBundledDirectory = false;
        if (!currentOrigin) return { facilities: [], status: 'needs_location' as const };

        const { facilities } = findOfflineFacilities({
          origin: currentOrigin,
          facilityType: query.facilityType,
          specialty: query.specialty,
          urgency: query.urgency,
          limit: query.limit,
        });

        // Outside the curated region there is nothing honest to show. `none_found` is
        // the truthful answer; inventing a hospital would be the alternative.
        if (facilities.length === 0) return { facilities: [], status: 'none_found' as const };

        usedBundledDirectory = true;
        return { facilities, status: 'ok' as const };
      },
    },
    aiTimeoutMs: 0,
  });
  return { engine, freshMemory: newConversationMemory };
}

/**
 * Builds the engine and keeps it, so the cost is paid once. The caller decides *when*
 * — this module is itself dynamically imported, so simply reaching this function has
 * already pulled the code across.
 */
export function warmOfflineEngine(): void {
  if (enginePromise) return;
  enginePromise = load().catch((error: unknown) => {
    // A failed warm-up must never break the online app; it is retried on first use.
    enginePromise = null;
    throw error;
  });
  void enginePromise.catch(() => undefined);
}

/** In-memory conversation state for the offline session. */
const memories = new Map<string, ConversationMemory>();

export const OFFLINE_CONVERSATION_ID = 'offline';

/**
 * Runs one turn entirely in the browser.
 *
 * Throws if the engine could not be loaded — the caller must treat that as "offline
 * triage unavailable" and say so, rather than silently producing nothing.
 */
export async function offlineTurn(request: TurnRequest, conversationId = OFFLINE_CONVERSATION_ID): Promise<TurnResponse> {
  enginePromise ??= load();
  const { engine, freshMemory } = await enginePromise;

  const previous = memories.get(conversationId) ?? freshMemory();
  // Read by the facility finder above. Never leaves this device — there is nothing to
  // send it to, and nothing to send it to even if there were.
  currentOrigin = request.location ?? null;

  const outcome = await engine.handleTurn(previous, {
    text: request.text,
    inputMode: request.inputMode ?? 'text',
    languagePreference: request.languagePreference ?? 'auto',
    ...(request.sttLanguage ? { sttLanguage: request.sttLanguage } : {}),
    ...(request.location ? { location: request.location } : {}),
    recentTurns: [],
  });
  memories.set(conversationId, outcome.memory);

  const degraded = new Set([
    ...outcome.response.degraded,
    // Nothing was written anywhere. The UI uses this to explain the missing history.
    'persistence_unavailable' as const,
  ]);
  // Only when hospitals were actually shown: it qualifies a list, and there is nothing
  // to qualify when the list is empty.
  if (usedBundledDirectory) degraded.add('facilities_offline');

  return {
    ...outcome.response,
    conversationId,
    turnId: `offline-${Date.now().toString(36)}`,
    degraded: [...degraded],
  };
}

/** Clears offline state — used by "new conversation" and by privacy deletion. */
export function resetOffline(conversationId?: string): void {
  if (conversationId) memories.delete(conversationId);
  else memories.clear();
}

/** True once the engine is loaded and a turn can be served without a network. */
export function offlineReady(): boolean {
  return enginePromise !== null;
}

# Architecture

## Shape of the system

```
                    ┌──────────────────────────── browser ────────────────────────────┐
  microphone ──▶ MediaRecorder + VAD ──▶  Next.js app (apps/web)  ──▶ audio playback
                    └───────────────┬────────────────────────────────┬────────────────┘
                                    │  /api/* (same-origin proxy)    │
                                    ▼                                │
                    ┌──────────────────────── Express API (apps/api) ─┴───────────────┐
                    │  requestId → access log → helmet → CORS → JSON → cookies →      │
                    │  auth → rate limits → route → Zod validation → service          │
                    └───────┬──────────────┬───────────────┬──────────────┬───────────┘
                            │              │               │              │
                    medical-safety        ai              maps            voice
                    (deterministic)  (Gemini/Claude,  (Places/curated)  (Gemini/11L/
                                       validated)                         browser)
                            │              │               │              │
                            └──────────────┴───────┬───────┴──────────────┘
                                                   ▼
                                   PostgreSQL via Prisma (encrypted fields)
```

The browser never talks to Gemini, ElevenLabs, Anthropic or Google Maps directly. Every provider
call is made server-side with a server-held key, and the Next.js server proxies
`/api/*` to the API so the key-bearing origin is never exposed to page JavaScript.
`npm run check:secrets` scans the built client bundles for any server secret name and
fails the build if one appears.

---

## A turn, step by step

`POST /v1/conversations/:id/turns` runs `ConversationEngine.handleTurn`
(`packages/ai/src/orchestrator/engine.ts`). In order:

**1. Language resolution.** `detectLanguage` scores the utterance for script (Devanagari,
Bengali) and for English, romanised-Hindi and romanised-Bengali marker words, combines
that with the STT engine's reported language and the user's stated preference, and
produces the reply language. The result is per turn, so switching mid-conversation just
works. Script is decisive when present, because the two Indic blocks do not overlap;
the romanised paths are deliberately asymmetric, and **Adding a language** below says
why.

**2. Deterministic extraction.** `extractSymptoms` normalises the text (invisible
characters stripped, clause boundaries marked), builds phonetic keys so `bukhaar`,
`bukhar` and `bukhaR` all collapse to the same token, and matches a multilingual symptom
lexicon. The phonetic rules are Latin-alphabet rules, so text already in an Indic script
takes a narrow branch that normalises only the marks writers and STT genuinely vary
(chandrabindu against anusvara, optional nukta) and leaves the spelling alone. Negation is handled with direction-aware windows — English negates forward
("no chest pain"), Hindi negates backward ("seene mein dard nahi hai").

**3. Emergency circuit breaker.** `assessEmergency` runs phrase rules against this
utterance and composite rules against every symptom accumulated so far. It is ordinary
TypeScript with no model in the path. If it fires, the engine stops: it returns a fixed,
localised instruction set, the verified contact list, and the nearest emergency-capable
facility (looked up under a timeout so a slow maps call can never delay the screen).
Nothing generated is shown.

**4. Intent.** Whether this is a new symptom report, an answer to the last question, a
request for a facility, directions, a greeting, thanks, a reset, or unrelated.

**5. AI understanding (optional).** With `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) set,
the utterance and a compact conversation state are sent to the model with a *forced*
function call. The arguments are parsed with Zod; anything that fails validation is
discarded and the turn continues on rules alone (`degraded: ["ai_invalid_output"]`). What survives is kept in a separate
`aiSymptoms` field and its urgency is **capped below emergency**. If the model believes
it has spotted an emergency the rules missed, it cannot escalate — it can only cause the
engine to ask one specific deterministic confirming question (`ai_emergency_confirm`).

**6. Follow-up planning.** `planFollowUp` picks the single highest-value next question:
red-flag screens for the reported symptoms first, then duration, severity and age, and
stops asking as soon as the answer can no longer change the outcome.

**7. Triage.** `evaluateTriage` maps the accumulated symptom set, duration, age group
and severity onto an urgency level through symptom profiles, and `buildTriageResult`
attaches the recommended action, the specialty, home-care advice, warning signs, a
confidence level and an explicit list of rationale codes. Those codes are what the
"Why this advice" panel shows — the explanation is the data, not a retelling.

**8. Facilities.** If the triage calls for care and a location is available,
`FacilityService` queries the active provider, ranks the results, and returns them with
reason codes. Results are cached per coarse location and query for `FACILITY_CACHE_TTL_S`.

**9. Phrasing.** The reply is assembled from localised templates. With a model available,
it may instead be phrased naturally — but only after passing the output guard, which
rejects any text claiming to be a doctor, stating a diagnosis, giving a dose or a
prescription, discouraging care, or containing a phone number that is not on the
verified list. A rejected phrasing silently falls back to the template.

**10. Persistence.** The turn is written in one transaction. If the database is
unreachable, the guidance is still returned, flagged `degraded: ["persistence_unavailable"]` —
a storage failure must never cost someone their answer.

---

## Emergency handling

`packages/medical-safety/src/emergency/` holds the whole layer.

- **Phrase rules** match explicit statements. The categories are `cardiac`, `breathing`,
  `stroke`, `unconscious`, `major_trauma`, `severe_bleeding`, `seizure`, `anaphylaxis`,
  `poisoning`, `self_harm`, `severe_burn`, `obstetric`, `infant_danger`,
  `meningitis_signs` and `user_requested` (someone asking for help outright).
- **Composite rules** fire on combinations that no single phrase captures — for example
  fever with a stiff neck and confusion.
- **Category priority** decides which payload to show when several match.
- **Dismissal suppression**: if the user says "this isn't an emergency", the same rule
  does not re-fire for the rest of the conversation; a *new*, different rule still can.
- `self_harm` gets its own path: the Tele-MANAS helpline (14416) leads, and no hospital
  navigation is offered.

Emergency contacts live in `packages/config/src/emergency.ts` and each carries a
`sourceUrl`. Only numbers in that file are ever shown or spoken.

---

## Adding a language

Four languages ship: English, Hindi, Hinglish and Bengali. The work of adding the fourth
is what the shape of this section describes, and none of it was a fork.

**What a language is, here.** Three separable things, which is why they can be done in
any order and shipped incomplete:

1. **Understood** — phrases in `lexicon/symptoms.ts`, the phrase rules in
   `emergency/rules.ts`, and the short-answer sets in `extraction/extract.ts`. These are
   plain arrays; a language is additive to every one of them and takes nothing away.
2. **Detected** — a script range in `text/normalize.ts` and, for Latin transcripts, a
   marker set in `text/language.ts`.
3. **Spoken back** — a `bn:` (or equivalent) field on the `Localized` records in
   `content/`, `triage/` and the response templates.

**Why English is the only fallback.** `Localized` requires `en` and makes every other
language optional, resolved by `pick`. The alternative — demanding every language for
every string — sounds rigorous and in practice means a fourth language never ships at
all, because no clinical sentence can be added until it has been translated and reviewed
four times. Here, a language ships as soon as the dangerous moments are written in it,
and the long tail falls back. The fallback chain is one link long on purpose: Hindi is
not a fallback for Bengali in any sense a reader would accept, and a plausible-looking
wrong-language string is harder to notice than an English one.

**Fallback is disclosed, not hidden.** `languageCoverage` in the web app reports the
share of the interface written in a language, and the language screen states it in that
language when it is below near-complete. Today that is true of Hindi and Hinglish as
well as Bengali — which was already the case, and simply was not said.

**Romanised detection is asymmetric on purpose.** Script decides when it is present.
For Latin transcripts, Bengali is claimed only on two or more distinctive markers *and*
strictly more than the Hinglish count, and a tie goes to Hinglish. Hindi and Bengali
share a great deal of vocabulary, and the costly error is answering an ordinary Hinglish
speaker in a script they may not read — so the tie-break favours the far commoner input.

**The suite follows the product.** `byLanguage` in the eval harness is driven by the
`LANGUAGES` constant rather than a list written in the harness, so a language added to
the product cannot quietly go unreported by the suite meant to vouch for it. The
headline counts on `/overview` are counted from the vignettes for the same reason.

**Cost.** Every language is bundled eagerly rather than fetched on demand, which is the
right call for this product specifically: the triage engine runs offline in the browser,
and someone who switches language with no connection must still get it. Bengali adds
about 34 KB of raw script to the first load, slightly less than Hindi's 50 KB.

---

## Facility ranking

`packages/maps/src/ranking.ts`. Eligibility filters run first — a facility that cannot
plausibly serve the request is removed rather than down-weighted. The survivors score on
four factors, combined with per-urgency weights:

| Urgency | distance | operational | relevance | service |
|---|---|---|---|---|
| emergency | 0.55 | 0.25 | 0.15 | 0.05 |
| urgent | 0.40 | 0.25 | 0.20 | 0.15 |
| routine | 0.35 | 0.15 | 0.20 | 0.30 |
| self-care | 0.50 | 0.20 | 0.20 | 0.10 |

Every facility carries reason codes explaining its position — `has_24x7_emergency`,
`open_now`, `closed_now`, `hours_unknown`, `specialty_verified`, `specialty_unverified`,
`general_hospital`, `government_hospital`, `closest_option`, `short_travel`,
`highly_rated`. A department is only ever claimed when the source lists it; when the
source is silent the UI says "not confirmed" rather than guessing. Curated entries carry
`sourceUrl` and `verifiedOn`, and approximate coordinates are labelled as such.

---

## Providers

Each external dependency sits behind an interface with a real and a mock implementation,
chosen at startup in `apps/api/src/container.ts` based on which keys are present and on
`PROVIDER_MODE`.

| Interface | Real | Fallback |
|---|---|---|
| `FacilityProvider` | Google Places API (New), field-masked | Curated, source-attributed Gurugram directory |
| `RoutingProvider` | Google Routes API distance matrix | Haversine distance × urban speed factor, marked `estimated` |
| `SpeechToText` | ElevenLabs Scribe, or Gemini audio understanding | Browser Web Speech API |
| `TextToSpeech` | ElevenLabs streaming TTS, or a Gemini speech-generation model | Browser `speechSynthesis` |
| `Understanding` | Gemini or Claude (validated forced function call) | Deterministic rules |

### The Gemini integration

One key covers all three AI surfaces, which is why `AI_PROVIDER=auto` prefers it: a
single credential lights up the whole app.

- **Endpoint.** `POST /v1beta/interactions`, with the key in an `x-goog-api-key` header
  (never in the URL, so it cannot leak through logs or referrers) and
  `Api-Revision: 2026-05-20` pinned.
- **Structured output.** A forced function call (`tool_choice.allowed_tools.mode = "any"`).
  Zod's JSON Schema is first narrowed by `toGeminiSchema`, which strips the keywords the
  function-declaration format rejects (`$schema`, `additionalProperties`, `const`) and
  collapses const-unions into plain enums.
- **Two response shapes.** Arguments are read from `steps[].function_call` and, failing
  that, from the older `candidates[].content.parts[].functionCall`. A model that answered
  in prose despite the forced call gets one last chance: fenced JSON is parsed out of the
  text. Anything that still fails Zod is an error, not a value.
- **Speech in.** Audio is sent inline as a typed `audio` part with a base64 payload,
  capped at 14 MB (the API allows 20 MB per request and base64 inflates by a third).
  The prompt asks for a bare transcript and the reply is treated strictly as text — audio
  from a caller is never allowed to act as an instruction.
- **Speech out.** The TTS model returns raw signed 16-bit little-endian PCM, which no
  browser will play, so `pcmToWav` prepends a 44-byte RIFF/WAVE header — no re-encoding
  and no extra dependency. Audio that already has a container passes through untouched,
  and the client picks its playback path from the response `Content-Type`.

The active set is reported verbatim by `GET /v1/capabilities`, and the UI names the
source on screen. Nothing is presented as more certain than it is.

---

## Data model

`prisma/schema.prisma` — `User`, `Session`, `Conversation`, `ConversationMessage`,
`SymptomEvent`, `TriageResult`, `Facility`, `FacilityCache`, `EmergencyEvent`,
`Feedback`, `AuditEvent`, `ClinicalReview`.

- Message text is stored as `v1.<iv>.<tag>.<ciphertext>` (AES-256-GCM, base64url) under
  `DATA_ENCRYPTION_KEY`.
- Location is stored as a geohash at precision 5 (≈5 km cells) — never raw coordinates.
- IPs are stored only as a keyed HMAC.
- `AuditEvent` records the action, not the content.
- Every row carries `expiresAt`; `npm run db:purge` deletes what has passed it.
- `ClinicalReview` is the one thing that deliberately survives that purge. Its link to
  the decision is nullable and set to NULL on delete, while snapshot columns keep the
  structured facts the reviewer was shown. A review is evidence about a *rule*, and the
  rule outlives the visit; what remains after a purge contains no message text, no
  location and no identifier for the patient. See **Clinician review** in `SAFETY.md`.

Prisma runs on `@prisma/adapter-pg` with the `prisma-client` generator, so no Rust query
engine binary is needed at runtime.

---

## Frontend

Next.js App Router with React 19 and Tailwind v4. The shared packages are consumed as
TypeScript source (`transpilePackages`), so the safety rules the server enforces and the
labels the client renders come from the same files.

The orb (`components/orb/voice-orb.tsx`) is a single canvas: an ambient aura, a
72-bar amplitude ring, three noise-deformed bodies, drifting motes, a clipped lighting
pass and a rim light. Loudness is read from a ref every frame, so audio never triggers a
React render. Mode and theme palettes cross-fade frame-rate-independently. Under reduced
motion it renders a static disc with a state ring instead.

Preferences (`theme`, `contrast`, `text scale`, `motion`) are applied by a pre-hydration
boot script that sets `data-*` attributes on `<html>`, so there is no flash and no
hydration mismatch.


---

## Offline triage

`packages/medical-safety` depends on nothing but `@sanjeevani/types` and
`@sanjeevani/config`, and `packages/ai` adds only Zod. No Node built-ins, no I/O. So the
whole safety engine runs in a browser, and `apps/web/src/lib/offline/offline-engine.ts`
does exactly that when the API cannot be reached.

It loads `ConversationEngine` — the same class the server constructs — with the
deterministic provider and a facility finder that returns nothing. There is no second
implementation of the rules to drift out of step with the first.

**When it engages.** Only on transport failures: a network error, or a 5xx. A 4xx is a
decision the server made, and second-guessing it in the browser would be worse than
showing it. `e2e/journey.spec.ts` asserts both halves of that.

**What still works:** language detection, symptom extraction, the emergency circuit
breaker, follow-up questions, triage, warning signs, and the full emergency screen —
the verified helpline numbers are bundled client-side and need no network at all.

**What does not, and says so:** hospital search (needs a network), natural phrasing (no
model is called, so replies come from the localised templates), and history (nothing is
persisted, and the response carries `persistence_unavailable`). A banner on the home
screen names the trade rather than degrading silently.

**How the code gets there.** The engine is dynamically imported and warmed on idle
after first load, so it is already in the browser cache before the connection fails.
The service worker serves `/_next/static/` cache-first — those files are content-hashed,
so a cache hit is always correct — and caches the app shell on navigation, which is what
lets a *reload* work offline rather than only a live tab.

### First-paint weight

Measured on the production build, at mobile viewport:

| | Over the wire |
|---|---|
| Before | 360 KB |
| After splitting the constants out of the Zod module | **269 KB** |

The client imported three constant arrays (`FACILITY_TYPES`, `SPECIALTIES`,
`URGENCY_LEVELS`) from `@sanjeevani/types`, whose barrel pulls in every Zod schema and
the Zod runtime — about 90 KB gzipped — even though the browser never validates
anything. Those vocabularies now live in `packages/types/src/constants.ts`, which has no
imports at all, exposed as `@sanjeevani/types/constants`. `domain.ts` derives its enums
from the same file, so there is still one source of truth.

What remains includes the offline engine itself. That is deliberate: its entire purpose
is to be present when the network is not, so fetching it while the connection still
works is the right trade for this product.

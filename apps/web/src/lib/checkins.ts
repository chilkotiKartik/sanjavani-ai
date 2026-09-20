import type { Urgency } from '@sanjeevani/types';
import { readArray, writeJson } from './storage';

/**
 * Check-ins: "how is it now?", asked at the interval the advice implies.
 *
 * ## The problem this solves
 *
 * Triage is a snapshot, and illness is not. The single most useful clinical fact
 * about a fever is whether it is going up or down, and the app has no way of knowing
 * that from one conversation. Worse, the advice it gives — "see a doctor if it does
 * not improve in two days" — quietly puts the burden of remembering on someone who is
 * unwell, and it is the people who most need to escalate who are least likely to.
 *
 * So the app remembers instead, and comes back with one question and three answers.
 * "Worse" starts a fresh conversation carrying that fact, so the rules re-run on new
 * information rather than on a recollection.
 *
 * ## Why this never leaves the device
 *
 * A record of who was ill, with what, and on which days, is the most sensitive thing
 * this app could hold. None of it is needed on a server for the feature to work — the
 * timing is arithmetic and the question is the same for everyone — so it is kept in
 * this browser alongside the emergency contact, for the same reason. Nothing here is
 * ever sent anywhere, and clearing browser data clears it.
 *
 * It follows that check-ins do not sync between devices, and that is a real
 * limitation. It is the right trade: a reminder that only works on one phone is worth
 * more than a medical history in someone else's database.
 */

export type Change = 'better' | 'same' | 'worse';

export interface CheckInEntry {
  at: number;
  change: Change;
}

export interface CheckIn {
  id: string;
  createdAt: number;
  /** When to ask. Milliseconds since the epoch. */
  dueAt: number;
  /** What was decided at the time, so the card can be specific without re-asking. */
  urgency: Urgency;
  /** Symptom labels as they were shown, already localised. Nothing coded or clinical. */
  symptoms: string[];
  /** The conversation this came from. May well have been deleted by the time it is due. */
  conversationId: string | null;
  status: 'pending' | 'closed';
  entries: CheckInEntry[];
}

export const CHECKINS_KEY = 'sv:checkins';

/** How long to wait before asking, by how urgent the situation was. */
const INTERVAL_HOURS: Partial<Record<Urgency, number>> = {
  self_care: 48,
  routine: 24,
  urgent: 6,
};

/**
 * Whether a check-in makes sense at all.
 *
 * Never offered for an emergency. Someone who has just been told to call 112 is not
 * a person to hand a reminder to — the only correct next step is already on screen,
 * and offering to follow up in six hours would read as though waiting were an option.
 */
export function checkInInterval(urgency: Urgency): number | null {
  return INTERVAL_HOURS[urgency] ?? null;
}

function parse(): CheckIn[] {
  return readArray<CheckIn>('local', CHECKINS_KEY)
    .filter((c): c is CheckIn => Boolean(c && typeof c.id === 'string' && typeof c.dueAt === 'number'))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/*
 * A tiny store over local storage, so React can subscribe to it properly.
 *
 * Reading storage in an effect and calling setState works, but it is a cascading
 * render and the lint rules rightly reject it: storage is an external system, and
 * `useSyncExternalStore` is what React provides for exactly this. Two things fall out
 * of doing it properly — the server render sees a stable empty list instead of a
 * hydration mismatch, and a change in one tab reaches the others, which matters more
 * than it sounds for something people leave open on a phone overnight.
 *
 * The snapshot is cached because it must be referentially stable between changes;
 * returning a freshly parsed array every read would loop.
 */
const EMPTY: CheckIn[] = [];
let cache: CheckIn[] | null = null;
const listeners = new Set<() => void>();

function changed(): void {
  cache = null;
  for (const listener of listeners) listener();
}

export function subscribeCheckIns(listener: () => void): () => void {
  listeners.add(listener);
  // `storage` fires in *other* tabs, which is exactly the case local mutation misses.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CHECKINS_KEY) changed();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function readCheckIns(): CheckIn[] {
  return (cache ??= parse());
}

/** Nothing exists during the server render, and saying so is the honest snapshot. */
export function serverCheckIns(): CheckIn[] {
  return EMPTY;
}

function save(list: CheckIn[]): void {
  // A bounded history. Twenty is far more than anyone will look at, and an unbounded
  // list in local storage is how a quiet feature turns into a quota error.
  writeJson('local', CHECKINS_KEY, list.slice(0, 20));
  changed();
}

export function createCheckIn(input: {
  urgency: Urgency;
  symptoms: string[];
  conversationId: string | null;
  now?: number;
}): CheckIn | null {
  const hours = checkInInterval(input.urgency);
  if (hours === null) return null;
  const now = input.now ?? Date.now();
  const checkIn: CheckIn = {
    id: `c${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    dueAt: now + hours * 3_600_000,
    urgency: input.urgency,
    symptoms: input.symptoms.slice(0, 4),
    conversationId: input.conversationId,
    status: 'pending',
    entries: [],
  };
  save([checkIn, ...readCheckIns()]);
  return checkIn;
}

/**
 * Records how things have changed, and decides what happens next.
 *
 * - **better** closes it. Nothing more to ask.
 * - **same** asks again after the same interval, because "no better" over a longer
 *   stretch is itself the signal that matters.
 * - **worse** closes it, and the caller starts a fresh conversation. Deliberately not
 *   handled here: "worse" is a clinical change, and the only thing that should decide
 *   what it means is the triage engine, on a new turn, with the rules running.
 */
export function recordChange(id: string, change: Change, now = Date.now()): CheckIn[] {
  const list = readCheckIns().map((c) => {
    if (c.id !== id) return c;
    const entries = [...c.entries, { at: now, change }];
    const hours = checkInInterval(c.urgency);
    if (change === 'same' && hours !== null && entries.length < 4) {
      return { ...c, entries, dueAt: now + hours * 3_600_000 };
    }
    return { ...c, entries, status: 'closed' as const };
  });
  save(list);
  return list;
}

export function closeCheckIn(id: string, now = Date.now()): CheckIn[] {
  const list = readCheckIns().map((c) => (c.id === id ? { ...c, status: 'closed' as const, entries: [...c.entries, { at: now, change: 'same' as const }] } : c));
  save(list);
  return list;
}

export function clearCheckIns(): void {
  save([]);
}

/**
 * "fever and body ache", not "fever, body ache".
 *
 * The label goes straight into a question a person reads — "How is the fever and body
 * ache now?" — so it has to be a phrase rather than a list. The connector is
 * translated because it differs across the three languages.
 */
export function joinSymptoms(symptoms: readonly string[], and: string): string {
  if (symptoms.length <= 1) return symptoms[0] ?? '';
  return `${symptoms.slice(0, -1).join(', ')} ${and} ${symptoms[symptoms.length - 1]}`;
}

/** "in 6 hours", "tomorrow", "2 days ago" — rough on purpose, and never a clock time. */
export function relativeTime(target: number, now: number, t: (key: 'ciNow' | 'ciInHours' | 'ciInDays' | 'ciHoursAgo' | 'ciDaysAgo', vars?: Record<string, string | number>) => string): string {
  const diff = target - now;
  const hours = Math.round(Math.abs(diff) / 3_600_000);
  if (hours < 1) return t('ciNow');
  const days = Math.round(hours / 24);
  if (diff > 0) return hours < 36 ? t('ciInHours', { n: hours }) : t('ciInDays', { n: days });
  return hours < 36 ? t('ciHoursAgo', { n: hours }) : t('ciDaysAgo', { n: days });
}

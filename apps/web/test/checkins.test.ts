import { beforeEach, describe, expect, it } from 'vitest';
import { CHECKINS_KEY, checkInInterval, clearCheckIns, closeCheckIn, createCheckIn, joinSymptoms, readCheckIns, recordChange, relativeTime } from '../src/lib/checkins';

/**
 * Check-ins hold the only durable record of somebody's illness this app keeps, so the
 * rules about when it asks, what it stores and when it stops are worth pinning down.
 *
 * A minimal local-storage stand-in: these tests run in Node, and the module's own
 * try/catch would otherwise quietly swallow every write and make the suite pass by
 * testing nothing.
 */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage, sessionStorage: storage };
  clearCheckIns();
});

const t = (key: string, vars?: Record<string, string | number>) =>
  ({ ciNow: 'just now', ciInHours: `in ${vars?.n}h`, ciInDays: `in ${vars?.n}d`, ciHoursAgo: `${vars?.n}h ago`, ciDaysAgo: `${vars?.n}d ago` })[key] ?? key;

describe('when a check-in is offered at all', () => {
  it('never follows up on an emergency', () => {
    // Someone told to call 112 is not a person to hand a reminder to: offering to ask
    // again in six hours would read as though waiting were one of the options.
    expect(checkInInterval('emergency')).toBeNull();
    expect(createCheckIn({ urgency: 'emergency', symptoms: ['chest pain'], conversationId: 'c1' })).toBeNull();
    expect(readCheckIns()).toHaveLength(0);
  });

  it('asks sooner the more urgent the advice was', () => {
    const urgent = checkInInterval('urgent');
    const routine = checkInInterval('routine');
    const selfCare = checkInInterval('self_care');
    expect(urgent).not.toBeNull();
    expect(urgent!).toBeLessThan(routine!);
    expect(routine!).toBeLessThan(selfCare!);
  });
});

describe('what a check-in stores', () => {
  it('keeps labels rather than codes, and nothing else clinical', () => {
    const now = Date.UTC(2026, 0, 1);
    const created = createCheckIn({ urgency: 'routine', symptoms: ['fever', 'body ache'], conversationId: 'conv-1', now });
    expect(created).not.toBeNull();
    const raw = JSON.parse((globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.getItem(CHECKINS_KEY) ?? '[]');
    expect(Object.keys(raw[0]).sort()).toEqual(
      ['conversationId', 'createdAt', 'dueAt', 'entries', 'id', 'status', 'symptoms', 'urgency'].sort(),
    );
    expect(raw[0].symptoms).toEqual(['fever', 'body ache']);
    expect(raw[0].dueAt).toBe(now + checkInInterval('routine')! * 3_600_000);
  });

  it('caps how many symptoms it carries', () => {
    const c = createCheckIn({ urgency: 'routine', symptoms: ['a', 'b', 'c', 'd', 'e', 'f'], conversationId: null });
    expect(c!.symptoms).toHaveLength(4);
  });
});

describe('answering it', () => {
  it('closes on better', () => {
    const c = createCheckIn({ urgency: 'routine', symptoms: ['fever'], conversationId: null })!;
    const [after] = recordChange(c.id, 'better');
    expect(after!.status).toBe('closed');
    expect(after!.entries.at(-1)!.change).toBe('better');
  });

  it('asks again on same, because no better over a longer stretch is the signal', () => {
    const now = Date.UTC(2026, 0, 1);
    const c = createCheckIn({ urgency: 'routine', symptoms: ['fever'], conversationId: null, now })!;
    const [after] = recordChange(c.id, 'same', now + 86_400_000);
    expect(after!.status).toBe('pending');
    expect(after!.dueAt).toBeGreaterThan(c.dueAt);
  });

  it('stops asking rather than nagging forever', () => {
    let list = [createCheckIn({ urgency: 'routine', symptoms: ['fever'], conversationId: null })!];
    for (let i = 0; i < 6; i += 1) list = recordChange(list[0]!.id, 'same');
    expect(list[0]!.status).toBe('closed');
  });

  it('closes on worse and leaves the clinical judgement to the engine', () => {
    const c = createCheckIn({ urgency: 'routine', symptoms: ['fever'], conversationId: null })!;
    const [after] = recordChange(c.id, 'worse');
    // Nothing here decides what "worse" means — the caller starts a new turn.
    expect(after!.status).toBe('closed');
    expect(after!.entries.at(-1)!.change).toBe('worse');
    expect(after).not.toHaveProperty('urgencyAfter');
  });

  it('can be stopped outright', () => {
    const c = createCheckIn({ urgency: 'urgent', symptoms: ['pain'], conversationId: null })!;
    expect(closeCheckIn(c.id)[0]!.status).toBe('closed');
  });
});

describe('how it reads', () => {
  it('joins symptoms into a phrase, not a list', () => {
    expect(joinSymptoms(['fever'], 'and')).toBe('fever');
    expect(joinSymptoms(['fever', 'body ache'], 'and')).toBe('fever and body ache');
    expect(joinSymptoms(['fever', 'cough', 'body ache'], 'aur')).toBe('fever, cough aur body ache');
    expect(joinSymptoms([], 'and')).toBe('');
  });

  it('describes time roughly, and never as a clock time', () => {
    const now = Date.UTC(2026, 0, 1, 12);
    expect(relativeTime(now, now, t)).toBe('just now');
    expect(relativeTime(now + 6 * 3_600_000, now, t)).toBe('in 6h');
    expect(relativeTime(now + 3 * 86_400_000, now, t)).toBe('in 3d');
    expect(relativeTime(now - 26 * 3_600_000, now, t)).toBe('26h ago');
    expect(relativeTime(now - 4 * 86_400_000, now, t)).toBe('4d ago');
  });
});

describe('storage that is not there', () => {
  it('degrades to nothing rather than throwing', () => {
    // Private mode, blocked cookies, a quota error: the app must keep working.
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem() {
          throw new Error('blocked');
        },
        setItem() {
          throw new Error('blocked');
        },
        removeItem() {
          throw new Error('blocked');
        },
      },
    };
    expect(() => readCheckIns()).not.toThrow();
    expect(readCheckIns()).toEqual([]);
    expect(() => createCheckIn({ urgency: 'routine', symptoms: ['fever'], conversationId: null })).not.toThrow();
  });
});

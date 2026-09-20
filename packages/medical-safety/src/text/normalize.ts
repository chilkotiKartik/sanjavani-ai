const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';
const DEVANAGARI_RE = /[ऀ-ॿ]/;
const DEVANAGARI_GLOBAL_RE = /[ऀ-ॿ]/g;
const BENGALI_RE = /[ঀ-৿]/;
const BENGALI_GLOBAL_RE = /[ঀ-৿]/g;
const LATIN_GLOBAL_RE = /[a-z]/gi;

export function hasDevanagari(text: string): boolean {
  return DEVANAGARI_RE.test(text);
}

export function hasBengali(text: string): boolean {
  return BENGALI_RE.test(text);
}

export function scriptRatio(text: string): { devanagari: number; bengali: number; latin: number } {
  const dev = text.match(DEVANAGARI_GLOBAL_RE)?.length ?? 0;
  const ben = text.match(BENGALI_GLOBAL_RE)?.length ?? 0;
  const lat = text.match(LATIN_GLOBAL_RE)?.length ?? 0;
  const total = dev + ben + lat;
  if (total === 0) return { devanagari: 0, bengali: 0, latin: 0 };
  return { devanagari: dev / total, bengali: ben / total, latin: lat / total };
}

/**
 * Romanised Hindi has no fixed spelling ("bukhar", "bukhaar", "bukhaaar").
 * The phonetic key flattens the most common variations so lexicon entries
 * only need one spelling per word.
 *
 * Every rule below ("ee" → "i", collapse doubled letters) is a rule about the Latin
 * alphabet, so a script that spells words exactly must not be put through them:
 * Bengali geminates such as ব্যথা and রক্ত would be quietly rewritten into words the
 * lexicon no longer contains. Indic text therefore takes its own narrow branch, which
 * normalises only the marks that writers and speech-to-text genuinely vary.
 */
export function phoneticStem(token: string): string {
  if (hasDevanagari(token)) return token.replace(/\u0901/g, '\u0902').replace(/\u093C/g, '');
  // Bengali chandrabindu \u2192 anusvara, drop nukta. Same reasoning as Devanagari.
  if (hasBengali(token)) return token.replace(/\u0981/g, '\u0982').replace(/\u09BC/g, '');
  return token
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/ph/g, 'f')
    .replace(/q/g, 'k');
}

export function phoneticKey(token: string): string {
  if (hasDevanagari(token)) {
    // Chandrabindu/anusvara are used interchangeably in casual writing and STT output.
    return token.replace(/ँ/g, 'ं').replace(/ं$/u, '').replace(/़/g, '');
  }
  if (hasBengali(token)) {
    // ঁ/ং are written interchangeably in casual Bengali and by STT; ় is optional.
    // Final ও ("jwôro" vs "jwôr") and the hasanta are likewise unstable in transcripts.
    return token
      .replace(/ঁ/g, 'ং')
      .replace(/়/g, '')
      .replace(/ং$/u, '')
      .replace(/্$/u, '');
  }
  return token
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/ph/g, 'f')
    .replace(/q/g, 'k')
    // Dropping a trailing n or h is meant to absorb spelling drift (nahin/nahi,
    // haih/hai), but on a short word it removes a letter the word needs: kaan (ear)
    // collapses to ka, which is also the Hindi possessive, so every "X ka dard"
    // matched "kaan dard" and put ear pain on the care card. The lookbehind keeps
    // three characters, which is enough for kaan → kan to stay distinct from ka
    // while nahin → nahi and mein → mei are unchanged.
    .replace(/(?<=.{3})n$/g, '')
    .replace(/(?<=.{3})h$/g, '');
}

/** Lowercase, unify digits and punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  let text = input.normalize('NFC').toLowerCase();
  text = text.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));
  text = text.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
  // Sentence/clause punctuation becomes a boundary token so phrase matching and
  // negation windows never leak across clauses ("no fever, headache").
  text = text.replace(/[।॥.,;!?]+/g, ` ${CLAUSE_BOUNDARY} `);
  text = text.replace(/[^\p{L}\p{M}\p{N}\s'|-]/gu, ' ');
  text = text.replace(/['-]/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  // Drop leading/trailing/duplicate boundaries.
  return text
    .split(' ')
    .filter((t, i, arr) => !(t === CLAUSE_BOUNDARY && (i === 0 || i === arr.length - 1 || arr[i - 1] === CLAUSE_BOUNDARY)))
    .join(' ');
}

export const CLAUSE_BOUNDARY = '|';

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  return normalized.length === 0 ? [] : normalized.split(' ');
}

/** Tokens mapped through the phonetic key — use for lexicon matching. */
export function keyedTokens(input: string): string[] {
  return tokenize(input).map(phoneticKey);
}

export function keyPhrase(phrase: string): string[] {
  return keyedTokens(phrase);
}

import type { Language } from '@sanjeevani/types';

/**
 * A string in as many of the app's languages as have been written.
 *
 * ## Why English is required and the rest are not
 *
 * The type used to demand every language for every string, which is a fine rule while
 * there are three of them and an impossible one the moment a fourth is added: it means
 * no language can ship until every clinical sentence in the product has been
 * translated, reviewed and re-reviewed. In practice that does not mean the fourth
 * language arrives complete. It means it never arrives, and a Bengali speaker gets
 * nothing at all — which is strictly worse than getting most of the app in Bengali and
 * the long tail in English.
 *
 * So English is the guaranteed floor and everything else is opt-in, resolved by
 * `pick`. Adding a language is now additive: write the lexicon so it is *understood*,
 * write the safety-critical content so the dangerous moments are in the right
 * language, and let the rest fall back honestly until someone translates it.
 *
 * ## What this must never be used to excuse
 *
 * Falling back silently. `coverage` exists so the app can tell someone which language
 * it is actually answering in, and the UI says so. A medical tool that quietly
 * switches language mid-sentence without admitting it is worse than one that admits it.
 */
export type Localized = LocalizedOf<string>;

/**
 * The same shape for anything else that varies by language — quick-reply buttons,
 * lists of phrases. English required, the rest optional, resolved by `pickOf`.
 */
export type LocalizedOf<T> = { en: T } & Partial<Record<Language, T>>;

/**
 * The string in the requested language, or English.
 *
 * English is the only fallback, deliberately. A chain through a "nearest" language
 * would be guesswork — Hindi is not a fallback for Bengali in any sense a reader would
 * accept — and a wrong-language string that looks plausible is harder to notice than
 * an English one.
 */
export function pick(text: Localized, language: Language): string {
  return text[language] ?? text.en;
}

/** `pick`, for tables of something other than a string. */
export function pickOf<T>(table: LocalizedOf<T>, language: Language): T {
  return table[language] ?? table.en;
}

/** Whether this string exists in the requested language at all. */
export function hasLanguage(text: Localized, language: Language): boolean {
  return text[language] !== undefined;
}

/** Fills {placeholders} in a localized template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

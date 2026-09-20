import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { buildQr } from '../src/lib/qr';

/**
 * These tests decode the code they generate.
 *
 * A QR code is the rare output where "it rendered" tells you nothing: a symbol built
 * from mangled bytes looks exactly as convincing as a correct one, and the failure only
 * surfaces when someone at a hospital desk points a phone at it. So rather than assert
 * on module counts, every test here round-trips through an independent decoder and
 * compares the text that comes back.
 */

/** Renders a matrix to the RGBA bitmap jsQR expects, one pixel per module. */
function toBitmap(qr: NonNullable<ReturnType<typeof buildQr>>): { data: Uint8ClampedArray; size: number } {
  const size = qr.size;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  // Re-read the dark modules straight from the path so the test exercises the same
  // geometry the component renders, rather than a second opinion about it.
  for (const run of qr.path.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
    const x = Number(run[1]);
    const y = Number(run[2]);
    const width = Number(run[3]);
    for (let i = 0; i < width; i++) {
      const offset = (y * size + x + i) * 4;
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
    }
  }
  return { data, size };
}

function roundTrip(text: string): string | null {
  const qr = buildQr(text);
  if (!qr) return null;
  const { data, size } = toBitmap(qr);
  return jsQR(data, size, size)?.data ?? null;
}

describe('care card QR', () => {
  it('round-trips plain English text', () => {
    const text = 'Care card — 19 Sep 2026\nFor: You · Adult\nReported: fever, body ache\nUrgency: See a doctor soon';
    expect(roundTrip(text)).toBe(text);
  });

  /*
   * The regression this file exists for. The library's stock encoder is Latin-1, so
   * every Bengali and Devanagari character would be truncated to a single meaningless
   * byte — encoding cleanly, rendering cleanly, and scanning as nonsense.
   */
  it('round-trips Bengali without mangling it', () => {
    const text = 'চিকিৎসা কার্ড\nকার জন্য: আপনি · প্রাপ্তবয়স্ক\nযা জানানো হয়েছে: জ্বর, গা ব্যথা\nপ্রস্তাবিত জরুরিতা: শিগগিরই ডাক্তার দেখান';
    expect(roundTrip(text)).toBe(text);
  });

  it('round-trips Devanagari without mangling it', () => {
    const text = 'केयर कार्ड\nकिसके लिए: आप · वयस्क\nबताया गया: बुखार, बदन दर्द\nसुझाई गई तात्कालिकता: जल्द डॉक्टर को दिखाएं';
    expect(roundTrip(text)).toBe(text);
  });

  it('round-trips a full-length card in the heaviest script', () => {
    // Bengali is three UTF-8 bytes per character, so a realistic Bengali card is the
    // largest payload this will ever be asked to carry.
    const text = [
      'চিকিৎসা কার্ড — হাসপাতালের ডেস্কের জন্য — ১৯ সেপ্টেম্বর ২০২৬',
      'কার জন্য: আপনার সন্তান · শিশু',
      'যা জানানো হয়েছে: জ্বর, গা ব্যথা, কাশি, বমি',
      'কতদিন ধরে: ৩ দিন',
      'প্রস্তাবিত জরুরিতা: আজই ডাক্তার দেখান',
      'যে বিভাগ চাইতে হবে: শিশু বিশেষজ্ঞ',
      'আগেই বাদ দেওয়া হয়েছে: ফুসকুড়ি, ঘাড় শক্ত, অসংলগ্ন ভাব, শ্বাসকষ্ট',
      'নিচের কিছু হলে সঙ্গে সঙ্গে ফিরে আসুন: ৩ দিনের বেশি জ্বর থাকা; শ্বাস নিতে কষ্ট',
      '',
      'এটি রোগ নির্ণয় নয়। রোগী যা বলেছেন তার ভিত্তিতে একটি স্বয়ংক্রিয় ট্রায়াজ সহায়ক এটি তৈরি করেছে।',
    ].join('\n');
    expect(roundTrip(text)).toBe(text);
  });

  it('returns null rather than a truncated card when the text cannot fit', () => {
    // Version 40 at error correction M tops out well below this.
    expect(buildQr('অ'.repeat(4000))).toBeNull();
  });
});

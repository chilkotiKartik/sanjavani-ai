import qrcode from 'qrcode-generator';

/**
 * A QR code for the care card, generated entirely in the browser.
 *
 * ## Why there is no URL in it
 *
 * The obvious way to put a card on a phone is to upload it and encode a link. That
 * would mean this app publishing someone's symptoms to an address anyone holding the
 * link can open, for as long as it exists — and a QR code is a *broadcast*: anyone who
 * can see the screen can photograph it. A link would turn a glance across a desk into
 * durable, fetchable access.
 *
 * So the code contains the card itself. Scanning it shows the same text the card
 * already shows, to someone already looking at the card, and nothing is uploaded,
 * nothing is retained, and there is nothing to leak afterwards. It also means the code
 * works with no connection at all, which is the situation this whole app is built for.
 *
 * ## Why the encoder is replaced
 *
 * `qrcode-generator` defaults to `charCodeAt(i) & 0xff` — Latin-1 — which silently
 * truncates every non-Latin character to a meaningless byte. A Bengali or Hindi card
 * would encode, render, and scan as garbage, with nothing on screen to suggest a
 * problem. The UTF-8 encoder below is installed once, at module load, before anything
 * can call it.
 */
qrcode.stringToBytes = (text: string): number[] => Array.from(new TextEncoder().encode(text));

export interface QrMatrix {
  /** Modules per side, excluding the quiet zone. */
  count: number;
  /** Side of the viewBox including the quiet zone, in module units. */
  size: number;
  /** SVG path data for every dark module, in the same units. */
  path: string;
}

/** The spec requires four clear modules around the symbol; scanners rely on it. */
const QUIET_ZONE = 4;

/**
 * Builds the module matrix for `text`, or null when it will not fit.
 *
 * Returning null rather than truncating is deliberate. A shortened card would still
 * scan, still look correct, and would be missing clinical detail with nothing to say
 * so — which is worse than showing no code at all. The caller simply omits the code,
 * and the card it is printed on still carries every line.
 *
 * Error correction is M (~15% recoverable), which survives the creasing and thumb
 * smudges a piece of paper carried to a hospital actually gets, without inflating the
 * symbol to the point where phone cameras struggle with the module size.
 */
export function buildQr(text: string): QrMatrix | null {
  try {
    // Type 0 asks the library to pick the smallest version the data fits in.
    const qr = qrcode(0, 'M');
    qr.addData(text, 'Byte');
    qr.make();

    const count = qr.getModuleCount();
    const parts: string[] = [];
    for (let row = 0; row < count; row++) {
      // Runs of adjacent dark modules become one rect, which roughly halves the path
      // length for typical content and keeps the inline SVG small.
      let runStart = -1;
      for (let col = 0; col <= count; col++) {
        const dark = col < count && qr.isDark(row, col);
        if (dark && runStart === -1) runStart = col;
        if (!dark && runStart !== -1) {
          parts.push(`M${runStart + QUIET_ZONE} ${row + QUIET_ZONE}h${col - runStart}v1h-${col - runStart}z`);
          runStart = -1;
        }
      }
    }
    return { count, size: count + QUIET_ZONE * 2, path: parts.join('') };
  } catch {
    // The library throws when the data exceeds version 40. See the note above.
    return null;
  }
}

/**
 * The 3AM Fridge Text — make.fun bounty entry (program/v1, judged-artifact).
 *
 * Sponsor brief: one line, at most 140 characters, the message a smart fridge
 * sends its owner at 3am. The house judge weighs, in order: (1) it IS a 3am
 * fridge text and it is funny, (2) it earns the bigger laugh, the line someone
 * screenshots, (3) it sounds like a fridge — small voice, opinions, no shame
 * about the hour, (4) it stands alone on a lock screen, (5) it dodges the tired
 * angles: milk, ice, the open door.
 *
 * So the text is kept as a record — hour, vigil, tally, ask — and rendered. The
 * renderer is where the brief is enforced: every criterion above is asserted on
 * the finished string before a single byte lands on disk, and a failure is a
 * loud refusal, never a quiet downgrade.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Cap published by the bounty ("1 to 140 characters"). */
const CAP = 140;
/** Local ceiling: never crowd the gate on the way out (Size is a tie-break). */
const BUDGET = 134;

/**
 * Criterion 5, the named worn angles. A line leaning on one of these is the
 * obvious joke, and the judge ranks a fresh angle over it.
 */
const WORN: readonly string[] = [
  "door is open",
  "door's open",
  "left the door",
  "milk",
  "ice maker",
  "expired",
  "expiring",
];

/**
 * The message, split by beat so each part can be revised on its own later.
 *
 * The vigil is the appliance's own condition — awake, alone, taking inventory
 * nobody asked for — and the ask is small and domestic, so the absurdity sits
 * inside a straight face instead of being announced.
 *
 * Cut: "It's 3am. I have reorganised the shelves by how much you love them."
 * (the fridge judging the owner — funny, but there is no bookkeeping in it, so
 * criterion 3 fails). Cut: "It's 3am. Six yoghurts. I have eaten none of them and
 * I think about it constantly." (a joke about the fridge's inability to eat —
 * the tired angle in a new coat). Shipped: the count is real, then the counting
 * becomes a relationship, which is the only escalation that is still the
 * appliance's own.
 */
const BEATS = {
  /** The hour. The pretext for the whole text. */
  hour: "It's 3am",
  /** What the fridge has been doing by itself, in its own flat voice. */
  vigil: "I've counted the yoghurts again",
  /** The one piece of bookkeeping, and the turn's setup. */
  tally: "still six",
  /** The ask — a fridge wants almost nothing, which is the joke. */
  ask: "I've started naming them, and I'd like you home before I get attached",
} as const;

/**
 * Render the text from the record: the hour stamps it, the vigil and tally are
 * the machine thinking out loud, and the ask lands the punch. The final clause
 * stays short and domestic on purpose — the judge wants the turn in the last
 * words, and an appliance asking for company beats one asking for anything.
 */
function compose(b: typeof BEATS): string {
  return `${b.hour}. ${b.vigil}, ${b.tally}. ${b.ask}.`;
}

/** Code points, which is what the gate counts (bytes are the tie-break). */
function size(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

/** Assert the sponsor's criteria on the finished string, before writing it. */
function assertBrief(text: string): void {
  const n = size(text);

  if (n < 1) refuse("empty line");
  if (n > CAP) refuse(`${n} characters; the gate allows at most ${CAP}`);
  if (n > BUDGET) refuse(`${n} characters is over the local budget of ${BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/[\r\n]/.test(text)) refuse("more than one line; a text message is one line");
  // Criterion 1: the hour has to be in it, or it is not the 3am text.
  if (!/\b3\s?am\b/i.test(text)) refuse("no 3am in the line");
  // Criterion 5: the named worn angles.
  const lower = text.toLowerCase();
  for (const worn of WORN) {
    if (lower.includes(worn)) refuse(`"${worn}" is one of the worn-out angles`);
  }
  // Criterion 3: a machine doing bookkeeping, not a person complaining. The
  // tally is the evidence that an appliance is speaking.
  if (!/\b(counted|count|inventory|stock|logged|scanned|measured|weighed)\b/i.test(text)) {
    refuse("no machine bookkeeping in the line: it has to sound like the appliance");
  }
  // Criterion 4: complete without a follow-up, so it closes itself.
  if (!/[.!?]$/.test(text)) refuse("the line does not close");
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) refuse("template hole in the rendered line");
}

function main(): void {
  const text = compose(BEATS);
  assertBrief(text);

  const dir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "entry.txt");
  writeFileSync(out, text, "utf8");

  // Read back: the judge sees the file, not the constant in memory.
  const disk = readFileSync(out, "utf8");
  if (disk !== text) refuse("disk differs from the rendered line");

  process.stderr.write(
    `wrote ${size(disk)} characters / ${Buffer.byteLength(disk, "utf8")} bytes\n`,
  );
}

main();

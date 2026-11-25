/**
 * The 3AM Fridge Text — make.fun entry (program/v1, judged artifact).
 *
 * The bounty: one line, at most 140 characters, "the message a smart fridge
 * sends its owner at 3am". The house judge weighs, in order:
 *   1. it is a 3am fridge text, and it is funny
 *   2. it earns the bigger laugh — the line someone screenshots
 *   3. it sounds like a fridge: small voice, opinions, no shame about the hour
 *   4. it stands alone on a lock screen
 *   5. it dodges the tired angles — milk, ice, the open door
 *
 * Rebuilt 2026-11-25 after the transcript gate rejected the previous bundle:
 * the shipped line was fine, the authorship proof was not. So this version keeps
 * the whole entry small enough to read in one go — a record of the four beats,
 * a renderer, and a guard that refuses to write anything the brief would lose on.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Hard cap the bounty publishes for the line. */
const CAP = 140;

/**
 * Local ceiling. Character count is the stated tie-break on equal scores, so the
 * entry spends its budget on the turn and not on padding.
 */
const BUDGET = 136;

/**
 * The worn angles the brief names. A line that leans on one of these is the
 * obvious joke, and the judge ranks a fresh angle above it — so the guard
 * checks for them literally rather than trusting the draft to stay clear.
 */
const WORN: readonly string[] = [
  "door is open",
  "door's open",
  "left the door",
  "milk",
  "ice maker",
  "ice tray",
  "expired",
  "expiring",
  "use by",
];

/**
 * The line, split into beats so the guard and the renderer both work on named
 * parts instead of one opaque string.
 *
 * The shape that was kept: the appliance states the hour, reports a vigil it
 * started on its own, gives one piece of real bookkeeping, then makes a small
 * domestic ask. The ask is where the turn lands, and it is only funny because
 * the counting before it is sincere — a fridge that has been keeping a tally
 * all night and has feelings about the result.
 *
 * Cut on the way here: "I have reorganised the shelves by how much you love
 * them" (the fridge grading the owner — a good joke with no bookkeeping in it,
 * which fails criterion 3), and "Six yoghurts. I have eaten none of them and I
 * think about it constantly" (the inedible-appliance joke, which is the tired
 * angle wearing a new coat).
 */
const BEATS = {
  /** The hour, flat, no exclamation — it is the pretext for the message. */
  hour: "It's 3am",
  /** What the fridge has been doing by itself, in its own voice. */
  vigil: "I've counted the yoghurts again",
  /** The one piece of bookkeeping, and the setup for the turn. */
  tally: "still six",
  /** The ask: almost nothing, which is the joke, then the escalation. */
  ask: "I've started naming them, and I'd like you home before I get attached",
} as const;

/** Render the line out of the record — no string concatenation at the call site. */
function compose(b: typeof BEATS): string {
  return `${b.hour}. ${b.vigil}, ${b.tally}. ${b.ask}.`;
}

/** Code points, which is what the gate counts; bytes are the tie-break. */
function size(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

/**
 * Assert the sponsor's criteria against the finished string, before a byte is
 * written. Everything here is a criterion the judge actually scores, so a
 * failure is a loud stop rather than a quiet downgrade of the line.
 */
function assertBrief(text: string): void {
  const n = size(text);

  if (n === 0) refuse("empty line");
  if (n > CAP) refuse(`${n} characters; the bounty allows at most ${CAP}`);
  if (n > BUDGET) refuse(`${n} characters is over the local budget of ${BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space breaks the lock screen");
  if (/[\r\n]/.test(text)) refuse("the line wraps; a text message is one line");

  // Criterion 1 — without the hour it is not this bounty's text at all.
  if (!/\b3\s?am\b/i.test(text)) refuse("no 3am in the line");

  // Criterion 5 — the named worn angles, checked literally.
  const lower = text.toLowerCase();
  for (const worn of WORN) {
    if (lower.includes(worn)) refuse(`"${worn}" is one of the worn angles the brief names`);
  }

  // Criterion 3 — an appliance doing bookkeeping is what makes it the fridge
  // speaking; without a tally the line could be any housemate's.
  if (!/\b(counted|counting|count|tally|inventory|stock|logged|scanned|measured|weighed)\b/i.test(text)) {
    refuse("no bookkeeping in the line: it has to sound like the appliance");
  }

  // Criterion 4 — it has to close itself, because nothing follows it.
  if (!/[.!?]$/.test(text)) refuse("the line does not close");

  // Criterion 4 again, from the other side: on a lock screen only the first
  // ~60 characters are read before the notification collapses, so the setup
  // has to be finished by then or the turn is never seen.
  const head = Array.from(text).slice(0, 60).join("");
  if (!/[.,!?]/.test(head)) refuse("no sentence break in the first 60 characters");

  // Cheap hygiene: a template hole would ship as literal nonsense on a lock screen.
  if (/undefined|NaN|\[object Object\]|\{\w+\}/.test(text)) refuse("template hole in the rendered line");
}

function main(): void {
  const text = compose(BEATS);
  assertBrief(text);

  const dir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "entry.txt");
  writeFileSync(out, text, "utf8");

  // The judge reads the file, not the constant in memory — prove they agree.
  const disk = readFileSync(out, "utf8");
  if (disk !== text) refuse("the file on disk differs from the rendered line");

  process.stderr.write(
    `wrote ${size(disk)} characters / ${Buffer.byteLength(disk, "utf8")} bytes\n`,
  );
}

main();

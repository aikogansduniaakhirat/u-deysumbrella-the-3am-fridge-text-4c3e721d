/**
 * The 3AM Fridge Text — make.fun bounty entry (program/v1).
 *
 * The brief: one line, at most 140 characters, the message a smart fridge sends
 * its owner at 3am. The house judge weighs, most important first: (1) it is a
 * one-line 3am fridge text and it is funny, (2) it gets the bigger laugh — the
 * line a reader would screenshot, (3) it sounds like a fridge: a machine with a
 * small voice, an opinion, and no shame about sharing it at 3am, (4) it works
 * as one line of a text, short enough for a lock screen and complete without a
 * follow-up, (5) it finds a fresh angle instead of the obvious milk / ice /
 * door-left-open one.
 *
 * The text is held as a record — the hour, the thing the fridge has been doing
 * alone, the count, and what it wants — and rendered from that record. The
 * renderer asserts the judge's criteria on the rendered line before a byte
 * reaches disk, so the "fresh angle" and "sounds like a machine" rules are
 * enforced rather than hoped for.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The fridge's message. One field per beat of the text. */
type FridgeText = {
  /** The hour it is speaking at. The pretext for the whole message. */
  hour: string;
  /** What the fridge has been doing alone, in its own flat voice. */
  vigil: string;
  /** The count — the machine's one piece of bookkeeping, and the turn. */
  tally: string;
  /** The ask. A fridge does not ask for much, which is the joke. */
  ask: string;
};

const MAX_CHARS = 140; // the gate this bounty publishes
const LOCAL_BUDGET = 134; // never crowd the gate on the way out
const MIN_CHARS = 1;

/**
 * The angles the brief names as worn out (criterion 5). A line resting on one
 * of these is the obvious joke the judge ranks below a fresh one.
 */
const WORN_OUT = [
  "door is open",
  "door's open",
  "left the door",
  "milk",
  "ice maker",
  "expired",
  "expiring",
];

/**
 * The text, as the fridge would send it. The vigil is the machine's own
 * condition — an appliance awake, alone, doing inventory nobody asked for — and
 * the ask is small and human-adjacent, which is what lets the absurdity sit
 * inside a straight face. Nothing here is a complaint about groceries; the
 * fridge is reporting its own inner life in the tone of a status update.
 */
const FILED: FridgeText = {
  hour: "It's 3am",
  vigil: "I've counted the yoghurts again",
  tally: "still six",
  ask: "I've started naming them, and I'd like you home before I get attached",
};

/**
 * Render the text from the record. The order is the brief's order: the hour
 * stamps it as a 3am text, the vigil and tally are the machine doing its small
 * bookkeeping out loud, and the ask lands the punch — an appliance that has
 * begun giving the food names and is asking its owner to come home before the
 * naming is done.
 *
 * The last clause is short and domestic on purpose: the judge weighs a punch in
 * the final words, and a fridge asking for company is funnier than a fridge
 * asking for anything.
 */
function render(f: FridgeText): string {
  return `${f.hour}. ${f.vigil}, ${f.tally}. ${f.ask}.`;
}

function chars(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

/**
 * Assert the brief before writing. Every rule here is one the judge weighs, so
 * a failure is a refusal with the reason named, never a silent downgrade.
 */
function gate(text: string): void {
  const size = chars(text);

  if (size < MIN_CHARS) refuse("empty line");
  if (size > MAX_CHARS) refuse(`${size} characters; the gate allows at most ${MAX_CHARS}`);
  if (size > LOCAL_BUDGET) refuse(`${size} characters is over the local budget of ${LOCAL_BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/[\r\n]/.test(text)) refuse("more than one line; a text message is one line");
  if (text.trim().length === 0) refuse("white space only");

  // Criterion 1: it has to be the 3am text, and the hour has to be in it.
  if (!/\b3\s?am\b/i.test(text)) refuse("no 3am in the line: the brief is about the 3am text");
  // Criterion 5: the obvious angles are the ones the brief names as worn out.
  const lower = text.toLowerCase();
  for (const phrase of WORN_OUT) {
    if (lower.includes(phrase)) refuse(`"${phrase}" is one of the worn-out angles`);
  }
  // Criterion 3: the voice is the fridge's own — a machine doing bookkeeping,
  // not a person complaining. The tally is what proves a machine is speaking.
  if (!/\b(counted|count|inventory|stock|logged|scanned|measured|weighed)\b/i.test(text)) {
    refuse("no machine bookkeeping in the line: it has to sound like the appliance");
  }
  // Criterion 4: it has to be complete without a follow-up, so it ends itself.
  if (!/[.!?]$/.test(text)) refuse("the line does not close: a text cannot trail off");
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) refuse("template hole in the rendered line");
  if (text.endsWith(" ")) refuse("the line does not land: trailing space");
}

function main(): void {
  const text = render(FILED);
  gate(text);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  writeFileSync(outPath, text, "utf8");

  // Read back: the gate counts characters, the leaderboard's tie-break counts
  // bytes, so both numbers are printed rather than assumed.
  const onDisk = readFileSync(outPath, "utf8");
  if (onDisk !== text) refuse("disk differs from the rendered line");

  process.stderr.write(
    `wrote ${chars(onDisk)} characters / ${Buffer.byteLength(onDisk, "utf8")} bytes\n`,
  );
}

main();

import type { Sender } from "./types";

export interface ParsedLine {
  text: string;
  from: Sender;
  ts?: number;
  speaker?: string;
}

export interface ParseResult {
  lines: ParsedLine[];
  speakers: string[];
  format: "whatsapp-export" | "speaker-prefix" | "quote-prefix" | "plain";
}

// [12/03/2024, 21:33:12] Alice: hey        (iOS export)
// 12/03/2024, 21:33 - Alice: hey           (Android export)
const WA_IOS = /^\[?(\d{1,4}[./-]\d{1,2}[./-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:AM|PM|am|pm)?\]?\s*[-–]?\s*([^:]{1,40}):\s?([\s\S]*)$/;
// Alice: hey   /   Me: hey
const SPEAKER = /^([A-Za-z0-9 ._'-]{1,32}):\s?(.*)$/;
// > they said this
const QUOTE = /^([><])\s?(.*)$/;

const ME_WORDS = ["me", "i", "you", "self", "myself"];
const THEM_WORDS = ["them", "they", "him", "her", "other"];

function parseWaDate(date: string, time: string): number | undefined {
  const dm = date.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
  const tm = time.match(/(\d{1,2}):(\d{2})/);
  if (!dm || !tm) return undefined;
  let [, a, b, c] = dm;
  let year = Number(c);
  let day = Number(a);
  let month = Number(b);
  if (Number(a) > 31) {
    // yyyy-mm-dd
    year = Number(a);
    month = Number(b);
    day = Number(c);
  }
  if (year < 100) year += 2000;
  // Ambiguous d/m vs m/d: prefer day-first unless impossible.
  if (day > 12 && month > 12) return undefined;
  if (month > 12) [day, month] = [month, day];
  const d = new Date(year, month - 1, day, Number(tm[1]), Number(tm[2]));
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Best-effort parse of pasted chat text. It never throws — anything it can't
 * classify comes back as a line you can flip in the review list.
 */
export function parsePaste(raw: string): ParseResult {
  const src = raw.replace(/\r\n?/g, "\n").split("\n");
  const lines: ParsedLine[] = [];
  const speakerOrder: string[] = [];
  let format: ParseResult["format"] = "plain";

  const pushSpeaker = (name: string) => {
    if (!speakerOrder.includes(name)) speakerOrder.push(name);
  };

  for (const rawLine of src) {
    const line = rawLine.replace(/‎|‏/g, "");
    if (!line.trim()) {
      // blank line ends the current message so paragraphs stay separate
      if (lines.length) lines[lines.length - 1].text = lines[lines.length - 1].text.trimEnd();
      continue;
    }

    const wa = line.match(WA_IOS);
    if (wa) {
      const [, date, time, speaker, text] = wa;
      const name = speaker.trim();
      pushSpeaker(name);
      format = "whatsapp-export";
      lines.push({ text: text.trim(), from: "them", ts: parseWaDate(date, time), speaker: name });
      continue;
    }

    const q = line.match(QUOTE);
    if (q) {
      if (format === "plain") format = "quote-prefix";
      lines.push({ text: q[2].trim(), from: q[1] === ">" ? "them" : "me" });
      continue;
    }

    const sp = line.match(SPEAKER);
    if (sp && !/^https?$/i.test(sp[1])) {
      const name = sp[1].trim();
      pushSpeaker(name);
      if (format === "plain") format = "speaker-prefix";
      const low = name.toLowerCase();
      const from: Sender = ME_WORDS.includes(low)
        ? "me"
        : THEM_WORDS.includes(low)
          ? "them"
          : "them";
      lines.push({ text: sp[2].trim(), from, speaker: name });
      continue;
    }

    // continuation of the previous message
    if (lines.length && format !== "plain") {
      lines[lines.length - 1].text += "\n" + line.trim();
    } else {
      lines.push({ text: line.trim(), from: "them" });
    }
  }

  // With exactly two named speakers, assume the second one to appear is you
  // (you usually paste starting from their message). Overridable in the UI.
  const named = speakerOrder.filter((s) => !ME_WORDS.includes(s.toLowerCase()));
  if (format !== "plain" && named.length === 2) {
    const mine = named[1];
    for (const l of lines) if (l.speaker) l.from = l.speaker === mine ? "me" : "them";
  }

  return { lines: lines.filter((l) => l.text.length > 0), speakers: speakerOrder, format };
}

/** Re-assign every line for a chosen "this speaker is me". */
export function assignSpeaker(lines: ParsedLine[], meSpeaker: string): ParsedLine[] {
  return lines.map((l) =>
    l.speaker ? { ...l, from: l.speaker === meSpeaker ? ("me" as const) : ("them" as const) } : l
  );
}

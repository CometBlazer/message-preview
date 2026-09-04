import type { Message, Platform, Sender, Side } from "./types";
import { dayLabel, timeOfDay } from "./util";

export interface Row {
  msg: Message;
  side: Side;
  /** first bubble of a same-sender run */
  first: boolean;
  /** last bubble of a same-sender run */
  last: boolean;
  /** divider text rendered above this message */
  divider?: string;
  /** last outgoing message in the whole thread (carries the read receipt) */
  isLastOut: boolean;
  draft?: boolean;
}

const GROUP_GAP_MS = 3 * 60 * 1000;
const DIVIDER_GAP_MS = 60 * 60 * 1000;

/**
 * POV is the crux of the app: whichever side you are "sitting on" renders on
 * the right. Flipping it re-renders the same thread from the other person's
 * phone without touching the data.
 */
export function sideFor(from: Sender, pov: Sender): Side {
  return from === pov ? "out" : "in";
}

export function buildRows(
  messages: Message[],
  pov: Sender,
  platform: Platform,
  hour24: boolean,
  now = Date.now()
): Row[] {
  const rows: Row[] = [];
  let lastOutIndex = -1;

  messages.forEach((msg, i) => {
    const side = sideFor(msg.from, pov);
    if (side === "out") lastOutIndex = i;

    const prev = messages[i - 1];
    const next = messages[i + 1];
    const newDay = !prev || dayLabel(prev.ts, now) !== dayLabel(msg.ts, now);
    const bigGap = !!prev && msg.ts - prev.ts > DIVIDER_GAP_MS;

    let divider: string | undefined;
    if (newDay || bigGap) {
      const day = dayLabel(msg.ts, now);
      const time = timeOfDay(msg.ts, hour24);
      divider =
        platform.engine === "whatsapp" || platform.engine === "bubble"
          ? newDay
            ? day
            : `${day} ${time}`
          : `${day} ${time}`;
    }

    const first =
      !prev ||
      prev.from !== msg.from ||
      msg.ts - prev.ts > GROUP_GAP_MS ||
      !!divider ||
      !!prev.system;
    const last =
      !next ||
      next.from !== msg.from ||
      next.ts - msg.ts > GROUP_GAP_MS ||
      !!next.system;

    rows.push({ msg, side, first, last, divider, isLastOut: false });
  });

  if (lastOutIndex >= 0) rows[lastOutIndex].isLastOut = true;
  return rows;
}

/**
 * Which bubble in a run carries the tail: iMessage/Telegram hang it off the
 * last one, WhatsApp off the first.
 */
export function hasTail(p: Platform, first: boolean, last: boolean): boolean {
  if (!p.tail) return false;
  if (p.engine === "whatsapp") return first;
  return last;
}

/** Corner radii for a grouped bubble stack. */
export function bubbleRadius(
  p: Platform,
  side: Side,
  first: boolean,
  last: boolean,
  tailed: boolean
): string {
  const r = p.radius;
  const t = p.tightRadius;
  let tl = side === "in" ? (first ? r : t) : r;
  let bl = side === "in" ? (last ? r : t) : r;
  let tr = side === "out" ? (first ? r : t) : r;
  let br = side === "out" ? (last ? r : t) : r;

  // Square off the corner the tail grows out of.
  if (tailed && p.engine === "whatsapp") {
    if (side === "out") tr = 0;
    else tl = 0;
  }
  if (tailed && p.id === "telegram") {
    if (side === "out") br = 0;
    else bl = 0;
  }
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

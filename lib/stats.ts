export interface DraftStats {
  chars: number;
  words: number;
  lines: number;
  sentences: number;
  questions: number;
  readingSeconds: number;
  tier: Tier;
}

export type Tier = "empty" | "quick" | "normal" | "long" | "essay" | "wall";

export const TIER_LABEL: Record<Tier, string> = {
  empty: "Nothing yet",
  quick: "One-liner",
  normal: "Normal",
  long: "Long",
  essay: "Essay",
  wall: "Wall of text",
};

export const TIER_COLOR: Record<Tier, string> = {
  empty: "#8a8a94",
  quick: "#37b26a",
  normal: "#37b26a",
  long: "#e0a52a",
  essay: "#e8762c",
  wall: "#e0463c",
};

export function analyze(text: string): DraftStats {
  const trimmed = text.trim();
  const chars = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lines = trimmed ? trimmed.split(/\n/).length : 0;
  const sentences = trimmed ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length || 1 : 0;
  const questions = (trimmed.match(/\?/g) || []).length;
  const readingSeconds = Math.round((words / 220) * 60);

  let tier: Tier = "empty";
  if (chars > 0) tier = "quick";
  if (chars > 90) tier = "normal";
  if (chars > 260) tier = "long";
  if (chars > 600) tier = "essay";
  if (chars > 1000) tier = "wall";

  return { chars, words, lines, sentences, questions, readingSeconds, tier };
}

/**
 * Split a draft into send-sized chunks at sentence/paragraph boundaries —
 * the fix for a wall of text is usually 3 messages, not fewer words.
 */
export function splitDraft(text: string, maxLen = 240): string[] {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];

  for (const para of paras) {
    if (para.length <= maxLen) {
      out.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?\n]+[.!?]*\s*/g) || [para];
    let buf = "";
    for (const s of sentences) {
      if (buf && (buf + s).trim().length > maxLen) {
        out.push(buf.trim());
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out.length ? out : [text.trim()].filter(Boolean);
}

export function notes(s: DraftStats, screenPct: number): string[] {
  const n: string[] = [];
  if (s.chars === 0) return n;
  if (screenPct >= 100) n.push("Taller than their whole screen — they have to scroll to read it.");
  else if (screenPct >= 55) n.push(`Fills ${Math.round(screenPct)}% of their screen in one bubble.`);
  if (s.questions === 0 && s.words > 40)
    n.push("No question in it — nothing obvious for them to reply to.");
  if (s.questions >= 3) n.push(`${s.questions} questions at once — expect answers to only one.`);
  if (s.readingSeconds >= 30) n.push(`About ${s.readingSeconds}s of reading.`);
  if (s.lines >= 6) n.push(`${s.lines} lines — reads like an email in a chat window.`);
  return n;
}

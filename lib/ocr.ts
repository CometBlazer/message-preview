import type { Sender } from "./types";

export interface OcrLine {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  conf: number;
}

export interface DetectedMessage {
  text: string;
  from: Sender;
  y: number;
}

export interface OcrOptions {
  /** ignore this fraction of the image at the top (nav bar) */
  cropTop?: number;
  /** ignore this fraction at the bottom (input bar) */
  cropBottom?: number;
  onProgress?: (pct: number, status: string) => void;
}

const NOISE =
  /^(delivered|read|sent|seen|now|today|yesterday|online|typing\.{0,3}|active now|message|imessage|text message|aa|\d{1,2}:\d{2}\s?(am|pm)?|[·•|<>^v~"'`.,:;_\-—–=+*#]{1,4})$/i;

async function exists(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Prefer the copies in /public/tesseract (see scripts/setup-ocr.mjs) so OCR
 * works with no network; fall back to tesseract.js's own CDN defaults.
 */
async function workerOptions() {
  if (await exists("/tesseract/worker.min.js")) {
    return {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/core",
      langPath: "/tesseract/lang",
      cacheMethod: "none" as const,
    };
  }
  return {};
}

function extractLines(data: any): OcrLine[] {
  const lines: OcrLine[] = [];
  const push = (l: any) => {
    const text = String(l.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const b = l.bbox ?? {};
    lines.push({
      text,
      x0: b.x0 ?? 0,
      x1: b.x1 ?? 0,
      y0: b.y0 ?? 0,
      y1: b.y1 ?? 0,
      conf: l.confidence ?? 0,
    });
  };
  if (Array.isArray(data?.blocks)) {
    for (const block of data.blocks)
      for (const para of block.paragraphs ?? []) for (const line of para.lines ?? []) push(line);
  } else if (Array.isArray(data?.lines)) {
    data.lines.forEach(push);
  }
  return lines;
}

/** Separable box blur over a single channel — used to estimate the background. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const win = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    let sum = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / win;
      sum -= src[row + Math.min(w - 1, Math.max(0, x - r))];
      sum += src[row + Math.min(w - 1, Math.max(0, x + r + 1))];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / win;
      sum -= tmp[Math.min(h - 1, Math.max(0, y - r)) * w + x];
      sum += tmp[Math.min(h - 1, Math.max(0, y + r + 1)) * w + x];
    }
  }
  return out;
}

/**
 * Chat screenshots mix dark-on-light (their bubbles) with light-on-colour
 * (yours), and Tesseract only reads the first kind reliably. Rather than guess
 * each region's polarity, measure how far every pixel sits from its local
 * background: anything that deviates — dark text or light text — comes out
 * black, and the background comes out white. One pass reads both.
 */
async function normalize(
  src: string
): Promise<{ url: string; width: number; height: number; scale: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  // Tesseract wants roughly 30px-tall glyphs; upscale small crops to reach it.
  const scale = img.width < 900 ? 1.7 : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h);

  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.data.length; i += 4, p++) {
    gray[p] = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
  }

  // radius of roughly one text line: wide enough to smear glyphs into the fill
  const bg = boxBlur(gray, w, h, Math.max(6, Math.round(h / 90)));

  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const dev = Math.abs(gray[p] - bg[p]);
    const v = Math.max(0, Math.min(255, 255 - (dev - 8) * 3.2));
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  return { url: c.toDataURL("image/png"), width: w, height: h, scale };
}

function boxOverlap(a: OcrLine, b: OcrLine): number {
  const vy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  const vx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  if (vy <= 0 || vx <= 0) return 0;
  const areaA = Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0));
  const areaB = Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
  return (vx * vy) / Math.min(areaA, areaB);
}

/**
 * Reads the polarity-normalised image first, then the original, and merges the
 * two by position — normalisation wins on coloured bubbles, the original wins
 * on anything the blur smeared away.
 */
export async function ocrImage(
  src: string,
  opts: OcrOptions = {}
): Promise<{ lines: OcrLine[]; width: number; height: number }> {
  const { onProgress } = opts;
  onProgress?.(2, "loading engine");
  const { createWorker } = await import("tesseract.js");
  const extra = await workerOptions();

  let pass = 0;
  const worker = await createWorker("eng", 1, {
    ...extra,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text")
        onProgress?.(8 + (pass * 0.5 + m.progress * 0.5) * 90, pass ? "second pass" : "reading text");
      else onProgress?.(6, m.status);
    },
  });

  try {
    let width = 0;
    let height = 0;
    let lines: OcrLine[] = [];

    let primary = src;
    let scale = 1;
    try {
      const norm = await normalize(src);
      primary = norm.url;
      width = norm.width;
      height = norm.height;
      scale = norm.scale;
    } catch {
      // normalisation is an optimisation; fall back to the raw screenshot
    }

    const first: any = await worker.recognize(primary, {}, { blocks: true, text: true });
    lines = extractLines(first.data);
    width = width || first.data?.imageWidth || Math.max(1, ...lines.map((l) => l.x1));
    height = height || first.data?.imageHeight || Math.max(1, ...lines.map((l) => l.y1));

    if (primary !== src) {
      pass = 1;
      try {
        const second: any = await worker.recognize(src, {}, { blocks: true, text: true });
        for (const raw of extractLines(second.data)) {
          // second pass ran on the un-upscaled image; bring its boxes over
          const l: OcrLine =
            scale === 1
              ? raw
              : { ...raw, x0: raw.x0 * scale, x1: raw.x1 * scale, y0: raw.y0 * scale, y1: raw.y1 * scale };
          const dup = lines.find((o) => boxOverlap(o, l) > 0.5);
          if (!dup) lines.push(l);
          else if (l.conf > dup.conf + 8) Object.assign(dup, l);
        }
        lines.sort((a, b) => a.y0 - b.y0);
      } catch {
        // second pass is a bonus
      }
    }

    onProgress?.(100, "done");
    return { lines, width, height };
  } finally {
    await worker.terminate();
  }
}

/**
 * Undo the tics OCR leaves on chat screenshots: bubble outlines read as stray
 * dashes and single letters at either end of a line, and a bare "l" or "|" is
 * almost always an "I".
 */
function tidy(text: string): string {
  let t = text
    .replace(/[_~^`"“”]+/g, " ")
    .replace(/[—–\-]{2,}/g, " ")
    .replace(/(^|\s)[|l](\s|$)/g, "$1I$2")
    .replace(/\s{2,}/g, " ")
    .trim();

  const junk = (w: string) => !/[A-Za-z0-9]/.test(w);
  const words = t.split(" ").filter(Boolean);
  while (words.length && junk(words[0])) words.shift();
  while (words.length && junk(words[words.length - 1])) words.pop();
  t = words.join(" ");

  // a lone letter stranded at either end is the bubble edge, not a word
  t = t.replace(/^([B-HJ-Zb-hj-z])[.,]?\s+/, "");
  if (t.split(" ").length > 3) t = t.replace(/\s+[A-Za-z][.,]?$/, "");

  return t.replace(/\s+([,.!?])/g, "$1").trim();
}

/**
 * Turn OCR lines into messages. Side comes from which edge the line hugs —
 * the one reliable signal in every chat app's layout — and consecutive lines
 * on the same side with a small vertical gap merge into one bubble.
 */
export function linesToMessages(
  lines: OcrLine[],
  width: number,
  height: number,
  opts: OcrOptions = {}
): DetectedMessage[] {
  const cropTop = opts.cropTop ?? 0.07;
  const cropBottom = opts.cropBottom ?? 0.9;
  const usable = lines
    .filter((l) => l.y0 > height * cropTop && l.y1 < height * cropBottom)
    .filter((l) => l.conf === 0 || l.conf > 32)
    .filter((l) => !NOISE.test(l.text))
    .sort((a, b) => a.y0 - b.y0);

  const sideOf = (l: OcrLine): Sender => {
    const leftGap = l.x0;
    const rightGap = width - l.x1;
    // A line hugging the right edge is yours; hugging the left is theirs.
    if (Math.abs(leftGap - rightGap) < width * 0.06) {
      return (l.x0 + l.x1) / 2 > width / 2 ? "me" : "them";
    }
    return rightGap < leftGap ? "me" : "them";
  };

  const out: DetectedMessage[] = [];
  let cur: { texts: string[]; from: Sender; y: number; prevBottom: number; h: number } | null = null;

  for (const l of usable) {
    const from = sideOf(l);
    const h = Math.max(8, l.y1 - l.y0);
    const gap = cur ? l.y0 - cur.prevBottom : Infinity;
    if (cur && cur.from === from && gap < h * 1.15) {
      cur.texts.push(l.text);
      cur.prevBottom = l.y1;
    } else {
      if (cur) out.push({ text: cur.texts.join(" "), from: cur.from, y: cur.y });
      cur = { texts: [l.text], from, y: l.y0, prevBottom: l.y1, h };
    }
  }
  if (cur) out.push({ text: cur.texts.join(" "), from: cur.from, y: cur.y });

  return out
    .map((m) => ({ ...m, text: tidy(m.text) }))
    .filter((m) => m.text.replace(/[^A-Za-z0-9]/g, "").length > 1);
}

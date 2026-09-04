import type { DeliveryStatus, Message, PlatformId, Thread } from "./types";
import { uid } from "./util";

/**
 * A whole conversation packed into a URL fragment.
 *
 * The fragment never leaves the browser — it isn't sent to whatever is serving
 * the app — so a link is self-contained: open it on another device, or send it
 * to someone who can reach the same address, and they get the thread.
 *
 * Photos and attachments are dropped: they're data URLs, and a link carrying
 * one would be megabytes long.
 */

const KEY = "t";

/** Compact wire shape — short keys, senders as 0/1, times as deltas. */
interface WireMessage {
  0: 0 | 1;
  1: string;
  2: number;
  3?: string;
  4?: DeliveryStatus;
}

interface Wire {
  v: 1;
  p: PlatformId;
  n: string;
  m: string;
  h?: string;
  c?: string;
  /** epoch seconds of the first message */
  t0: number;
  s: WireMessage[];
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deflate(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([new TextEncoder().encode(text)])
      .stream()
      .pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

export async function encodeThread(thread: Thread): Promise<string> {
  const msgs = thread.messages.filter((m) => m.text.trim() || m.image);
  const t0 = Math.floor((msgs[0]?.ts ?? Date.now()) / 1000);

  const wire: Wire = {
    v: 1,
    p: thread.platform,
    n: thread.name,
    m: thread.myName,
    h: thread.handle || undefined,
    c: thread.matchContext || undefined,
    t0,
    s: msgs.map((m) => {
      const w: WireMessage = {
        0: m.from === "me" ? 1 : 0,
        1: m.text,
        2: Math.round(m.ts / 1000) - t0,
      };
      if (m.reaction) w[3] = m.reaction;
      if (m.status) w[4] = m.status;
      return w;
    }),
  };

  const json = JSON.stringify(wire);
  const packed = await deflate(json);
  return packed ? "z" + toBase64Url(packed) : "u" + toBase64Url(new TextEncoder().encode(json));
}

export async function decodeThread(payload: string): Promise<Thread | null> {
  try {
    const mode = payload[0];
    const bytes = fromBase64Url(payload.slice(1));
    const json = mode === "z" ? await inflate(bytes) : new TextDecoder().decode(bytes);
    const wire = JSON.parse(json) as Wire;
    if (!wire || wire.v !== 1 || !Array.isArray(wire.s)) return null;

    const now = Date.now();
    const messages: Message[] = wire.s.map((w) => ({
      id: uid(),
      from: w[0] === 1 ? "me" : "them",
      text: String(w[1] ?? ""),
      ts: (wire.t0 + (Number(w[2]) || 0)) * 1000,
      reaction: w[3],
      status: w[4],
    }));

    return {
      id: uid(),
      platform: wire.p,
      name: wire.n || "Shared chat",
      myName: wire.m || "Me",
      handle: wire.h ?? "",
      matchContext: wire.c,
      messages,
      createdAt: now,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${KEY}=${payload}`;
}

/** The payload in the current URL, if this page was opened from a share link. */
export function readSharePayload(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith(`${KEY}=`)) return null;
  return hash.slice(KEY.length + 1) || null;
}

/** Drop the payload from the address bar once it's been imported. */
export function clearShareHash(): void {
  const { origin, pathname, search } = window.location;
  window.history.replaceState(null, "", `${origin}${pathname}${search}`);
}

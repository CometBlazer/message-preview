export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function timeOfDay(ts: number, hour24: boolean): string {
  const d = new Date(ts);
  if (hour24) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today" / "Yesterday" / "Wednesday" / "Mar 3, 2024" */
export function dayLabel(ts: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return DAYS[new Date(ts).getDay()];
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${sameYear ? "" : ", " + d.getFullYear()}`;
}

/** WhatsApp-style all-caps divider chip. */
export function dayChip(ts: number, now = Date.now()): string {
  const l = dayLabel(ts, now);
  return l.toUpperCase();
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable pastel colour for a name, used for default avatars. */
export function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 52% 58%)`;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Downscale an image data URL so screenshots don't bloat localStorage. */
export async function shrinkImage(dataUrl: string, maxDim = 1400): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale >= 1) return dataUrl;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.86);
}

/**
 * Screenshots are tall and narrow, so capping the *longest* side would squeeze
 * the width — and with it the glyph size OCR depends on. Cap the width only.
 */
export async function limitWidth(dataUrl: string, maxW = 1200): Promise<string> {
  const img = await loadImage(dataUrl);
  if (img.width <= maxW) return dataUrl;
  const scale = maxW / img.width;
  const c = document.createElement("canvas");
  c.width = maxW;
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Generates the PWA icons with no image dependencies — plain maths + zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = new URL("../public/icons/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = ~0;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const roundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return Math.hypot(x - cx, y - cy) <= r && x >= x0 && x <= x1 && y >= y0 && y <= y1;
};

const inTriangle = (px, py, [ax, ay], [bx, by], [cx, cy]) => {
  const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  const s = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / d;
  const t = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / d;
  return s >= 0 && t >= 0 && s + t <= 1;
};

function render(size, { padding = 0 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const S = 3; // supersampling
  const pad = size * padding;
  const x0 = pad;
  const x1 = size - pad;
  const r = (x1 - x0) * 0.235;

  // speech bubble geometry, relative to the icon square
  const bx0 = x0 + (x1 - x0) * 0.2;
  const bx1 = x0 + (x1 - x0) * 0.8;
  const by0 = x0 + (x1 - x0) * 0.24;
  const by1 = x0 + (x1 - x0) * 0.62;
  const br = (x1 - x0) * 0.11;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0;
      let fgHits = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          if (roundRect(px, py, x0, x0, x1, x1, r)) bgHits++;
          const bubble =
            roundRect(px, py, bx0, by0, bx1, by1, br) ||
            inTriangle(
              px,
              py,
              [bx0 + (bx1 - bx0) * 0.18, by1 - 2],
              [bx0 + (bx1 - bx0) * 0.2, by1 + (x1 - x0) * 0.16],
              [bx0 + (bx1 - bx0) * 0.52, by1 - 2]
            );
          if (bubble) fgHits++;
        }
      }
      const i = (y * size + x) * 4;
      const bgA = bgHits / (S * S);
      const fgA = fgHits / (S * S);
      // indigo → violet diagonal gradient
      const t = (x + y) / (size * 2);
      const rr = Math.round(88 + t * 88);
      const gg = Math.round(101 - t * 20);
      const bb = Math.round(242 + t * 8);
      const mix = (base, over) => Math.round(base * (1 - fgA) + over * fgA);
      buf[i] = mix(rr, 255);
      buf[i + 1] = mix(gg, 255);
      buf[i + 2] = mix(bb, 255);
      buf[i + 3] = Math.round(255 * Math.max(bgA, fgA * bgA));
    }
  }
  return png(size, size, buf);
}

writeFileSync(new URL("icon-192.png", OUT), render(192));
writeFileSync(new URL("icon-512.png", OUT), render(512));
console.log("icons written to public/icons");

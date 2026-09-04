/**
 * Zero-dependency static server for the exported ./out build, on the LAN so
 * you can open it on your phone and install it as a PWA.
 * Run: npm run serve
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".gz": "application/gzip",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

if (!existsSync(root)) {
  console.error("No ./out directory — run `npm run build` first.");
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let path = normalize(join(root, url));
  if (!path.startsWith(root)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) path = join(root, "index.html"); // SPA fallback

  const type = TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, {
    "content-type": type,
    "cache-control": path.includes("_next") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(path).pipe(res);
});

server.listen(port, () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((n) => n && n.family === "IPv4" && !n.internal)
    .map((n) => n.address);
  console.log(`\n  Message Preview\n`);
  console.log(`  local:   http://localhost:${port}`);
  for (const ip of ips) console.log(`  network: http://${ip}:${port}`);
  console.log(
    `\n  Installing on a phone needs https (or localhost). Easiest route:\n` +
      `  run this, then tunnel it, or open it on the desktop and use "Install app".\n`
  );
});

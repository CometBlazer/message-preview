/**
 * Copies the Tesseract worker + wasm core into public/tesseract and downloads
 * the English model, so screenshot import works with no network at all.
 * Needs the internet once (for the ~15 MB model). Run: npm run setup-ocr
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "tesseract");
const coreOut = join(outDir, "core");
const langOut = join(outDir, "lang");

for (const d of [outDir, coreOut, langOut]) mkdirSync(d, { recursive: true });

// 1. worker
const worker = join(root, "node_modules", "tesseract.js", "dist", "worker.min.js");
if (!existsSync(worker)) {
  console.error("tesseract.js not installed — run npm install first.");
  process.exit(1);
}
copyFileSync(worker, join(outDir, "worker.min.js"));

// 2. wasm core (all variants; the worker picks by CPU features)
const coreDir = join(root, "node_modules", "tesseract.js-core");
let copied = 0;
for (const f of readdirSync(coreDir)) {
  if (f.endsWith(".js") || f.endsWith(".wasm")) {
    copyFileSync(join(coreDir, f), join(coreOut, f));
    copied++;
  }
}

// 3. language model
const LANG_URL = "https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz";
const langFile = join(langOut, "eng.traineddata.gz");

if (existsSync(langFile) && statSync(langFile).size > 1_000_000) {
  console.log("eng.traineddata.gz already present");
} else {
  process.stdout.write("downloading eng.traineddata.gz … ");
  try {
    const res = await fetch(LANG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(langFile, Buffer.from(await res.arrayBuffer()));
    console.log("ok");
  } catch (e) {
    console.log("failed");
    console.error(
      `Could not download the model (${e.message}).\n` +
        `Screenshot import will fall back to the tesseract.js CDN, which needs a connection.\n` +
        `To fix it later, save ${LANG_URL} to public/tesseract/lang/eng.traineddata.gz`
    );
  }
}

console.log(`OCR assets ready: worker + ${copied} core files in public/tesseract`);

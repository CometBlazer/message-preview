# Message Preview

Draft a text and see exactly how it lands on the other person's phone — in
iMessage, WhatsApp, Instagram, Hinge, Telegram, Messenger, Google Messages,
Tinder or Discord.

Everything runs in the browser. Nothing is uploaded, there is no account, and
after the first load it works offline as an installed PWA.

## Why it exists

A wall of text reads very differently from the receiving side. Type the message
once, flip to **their phone**, and the same words come back as a grey bubble
that eats 66% of their screen — with the live measurement to prove it.

## Running it

```bash
npm install
npm run setup-ocr     # once, needs internet: copies the OCR engine + English model into public/
npm run dev           # http://localhost:3000
```

For the installable, offline version:

```bash
npm run build         # static export into ./out
npm run serve         # serves ./out on localhost:4173 and your LAN address
```

Then open it in Chrome and use **Install app** (or Add to Home Screen on iOS).
Installing needs `https` or `localhost` — over the LAN address a browser will
serve the page but won't offer to install it, so either install from the
desktop or put it behind a tunnel/static host.

## What's in it

**Nine platform skins.** Header, bubbles, tails, grouping, timestamps, read
receipts, input bar and status bar per platform, in light and dark. Bubble
grouping, day dividers and tail placement follow each app's own rules
(WhatsApp tails the first bubble of a run, iMessage and Telegram the last).

**POV switch.** *My phone* / *their phone* re-renders the same thread from the
other side: your messages move left, the header becomes you, and read receipts
follow. Nothing in the data changes.

**Live draft.** What you type appears as a real bubble in the preview as you
type it, with:

- character, word and reading-time counts
- **% of their screen** — measured from the rendered bubble against the phone
  body, not estimated from the character count, so it differs per platform
- notes like *"No question in it — nothing obvious for them to reply to"*
- **Split into N** — breaks the draft at sentence boundaries and sends it as
  separate messages, which is usually the actual fix for a wall of text

**Import history.**

- *Paste text* — handles `Name: message` transcripts, WhatsApp exports
  (`[12/03/2024, 21:33] Alice: …`), and `>` quoting; asks which speaker is you.
- *Screenshot* — drop, pick or Ctrl+V a chat screenshot and it OCRs it locally
  (Tesseract, in a worker). Which side a line hugs decides whose message it is.

  Both land in an editable review list before anything is added to the thread.
  OCR is assistive, not exact — expect to fix a word here and there, especially
  on small text. See *How the OCR works* below. The service worker precaches
  the app shell but not the 15 MB language model, so run one screenshot import
  while the files are reachable; after that OCR is cached too.

**Thread editing.** Swap a message's sender, reorder, retime, attach an image,
add a reaction, set delivery status per message. Each message's controls sit on
their own footer line with 32px targets and the delete button set apart behind
a divider, so nothing destructive is a near-miss away.

**Undo.** Ctrl/Cmd+Z undoes any edit — a deleted message, a cleared thread, a
reorder, an import, a colour change — and Ctrl+Shift+Z (or Ctrl+Y) redoes it.
The buttons next to the POV switch do the same. Inside a text box the shortcut
is left alone so the browser's own text undo still works, which is what you
want mid-sentence; a run of keystrokes collapses into one undo step. History
is 60 steps deep and lives only for the session.

**Confirmations** guard everything destructive that touches saved data:
deleting a message, Clear all, deleting a chat, clearing the draft, removing a
photo or an attached image, resetting colours, discarding an import. Dropping a
single line from the import review list is the one exception — nothing is saved
yet at that point and confirming each junk OCR line would be miserable.

**Colour tuner.** Every shade is a token in `lib/platforms.ts`, editable per
platform and per theme from the Setup tab and stored with your data. My values
are close but they were not sampled from the real apps — hold a real screenshot
next to the preview and nudge anything that looks off.

**Export.** Save the preview as a PNG (captures what you're actually looking
at, scroll position included), or back up everything as JSON.

## How the OCR works

Chat screenshots mix dark-on-light (their bubbles) with light-on-colour
(yours), and Tesseract only reads the first kind reliably. Rather than guess
each region's polarity, `lib/ocr.ts` blurs the image to estimate the local
background and keeps the *deviation* from it: any pixel that differs from its
surroundings — dark text or light text — comes out black, and the background
comes out white. Both bubble types then read in one pass. The original image is
read as a second pass and merged by bounding box, keeping whichever was more
confident.

Sender assignment is geometric: a line hugging the right edge is yours, the
left is theirs. Consecutive lines on the same side with a small vertical gap
merge into one bubble.

`npm run setup-ocr` copies the worker and wasm core out of `node_modules` and
downloads `eng.traineddata.gz` into `public/tesseract/`, so OCR needs no
network at run time. Without it the app falls back to the tesseract.js CDN,
which does.

## Layout of the code

```
app/
  globals.css      workbench (the dark tool around the phone)
  chat.css         phone frame + every platform skin
components/
  Workbench.tsx    3-pane shell, POV + platform switching
  Preview.tsx      maps a platform to its engine, sets the CSS variables
  Composer.tsx     draft box, live measurement, split
  Editor.tsx       transcript editing
  ImportPanel.tsx  paste + screenshot import with review
  SettingsPanel.tsx chat details, phone options, colour tuner, export
  chat/            IMessage, WhatsApp, Instagram, Hinge, BubbleChat, Discord
lib/
  platforms.ts     every colour and layout constant, per platform per theme
  grouping.ts      POV, bubble grouping, tails, corner radii
  stats.ts         draft analysis and splitting
  parse.ts         pasted-transcript parsing
  ocr.ts           screenshot OCR
  store.tsx        reducer + localStorage persistence
```

Adding a platform is a new entry in `lib/platforms.ts` plus, if its layout is
genuinely different, an engine component. Four platforms share `BubbleChat`.

## Storage

Threads, drafts and settings live in `localStorage` under `message-preview:v1`.
Attached images are downscaled first, but that quota is a few MB — if you
attach many screenshots you'll see a warning banner; back up to JSON and delete
old threads.

## Known limits

- Platform colours are careful approximations, not sampled values. The tuner
  exists precisely because of that.
- OCR quality depends on the screenshot. Crop tightly, avoid heavy compression.
  Very short lines ("ok", "lol") are the ones it misses.
- Group chats aren't modelled — every thread is one-to-one.

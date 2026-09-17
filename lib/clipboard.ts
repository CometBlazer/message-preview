/**
 * Clipboard writes, with a fallback for the places `navigator.clipboard` isn't
 * there or doesn't answer: it needs a secure context, so a phone hitting the
 * dev server over plain http on the LAN — exactly how you'd check the mobile
 * layout — has no async clipboard at all. And when the window is in the
 * background Chrome can leave `writeText` pending forever rather than
 * rejecting, so the call is raced against a timeout: a copy button that never
 * says anything is worse than one that falls back.
 */

const ASYNC_TIMEOUT_MS = 1200;

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    // off-screen but still selectable — display:none wouldn't be
    ta.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard?.writeText) {
    const wrote = await Promise.race([
      navigator.clipboard.writeText(text).then(
        () => true,
        () => false
      ),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ASYNC_TIMEOUT_MS)),
    ]);
    if (wrote) return true;
  }

  return legacyCopy(text);
}

/** The thread as plain text, the way you'd paste it into a note. */
export function transcriptText(
  messages: { from: "me" | "them"; text: string }[],
  meName: string,
  themName: string
): string {
  return messages
    .filter((m) => m.text.trim())
    .map((m) => `${m.from === "me" ? meName : themName}: ${m.text.trim()}`)
    .join("\n");
}

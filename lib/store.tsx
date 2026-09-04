"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type {
  Message,
  PlatformId,
  PlatformTheme,
  Sender,
  Settings,
  Thread,
} from "./types";
import { clearShareHash, decodeThread, readSharePayload } from "./share";
import { getPlatform } from "./platforms";
import { uid } from "./util";

const KEY = "message-preview:v1";

export interface State {
  threads: Thread[];
  activeId: string | null;
  drafts: Record<string, string>;
  settings: Settings;
  loaded: boolean;
  storageError: string | null;
  /** undo history; never persisted */
  past: Snapshot[];
  future: Snapshot[];
  /** transient status line for the UI (undo/redo, shared-link import) */
  notice: { label: string; dir: "undo" | "redo" | "info"; at: number } | null;
}

/** The slice of state that undo restores. */
export interface Snapshot {
  threads: Thread[];
  activeId: string | null;
  drafts: Record<string, string>;
  settings: Settings;
  label: string;
  /** consecutive edits sharing a key collapse into one undo step */
  key: string;
  at: number;
}

const HISTORY_LIMIT = 60;
const MERGE_MS = 1500;

const defaultSettings: Settings = {
  theme: "auto",
  pov: "me",
  draftFrom: "me",
  showFrame: true,
  showStatusBar: true,
  showTyping: false,
  showDraft: true,
  hour24: false,
  clockLabel: "9:41",
  overrides: {},
};

function seedThread(): Thread {
  const now = Date.now();
  const m = (from: Sender, text: string, minsAgo: number): Message => ({
    id: uid(),
    from,
    text,
    ts: now - minsAgo * 60000,
  });
  return {
    id: uid(),
    platform: "imessage",
    name: "Sam",
    handle: "+1 (555) 019-2837",
    myName: "Me",
    matchContext: "You liked their prompt: “The way to win me over is…”",
    messages: [
      m("them", "hey! how was the thing on saturday", 190),
      m("me", "honestly so much better than I expected", 188),
      m("them", "told you 😌", 187),
      m(
        "me",
        "ok so I've been thinking about what you said about moving in the spring and I really do think it makes sense, like the lease is up anyway and neither of us loves the neighbourhood, plus if we time it right we could do the whole thing over one weekend instead of dragging it out. the only part I'm unsure about is whether we try to stay in the same area or actually go somewhere completely different, which is a bigger conversation, but I wanted to say it now rather than sit on it for another month like I did last time",
        4
      ),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Starts empty on purpose: the seed thread is built from Date.now(), so
 * creating it during the server render and again on the client would produce
 * a hydration mismatch. The client seeds it in the hydrate effect instead.
 */
function initialState(): State {
  return {
    threads: [],
    activeId: null,
    drafts: {},
    settings: defaultSettings,
    loaded: false,
    storageError: null,
    past: [],
    future: [],
    notice: null,
  };
}

export type Action =
  | { type: "hydrate"; state: Partial<State> }
  | { type: "newThread"; platform: PlatformId; name?: string }
  | { type: "deleteThread"; id: string }
  | { type: "setActive"; id: string }
  | { type: "patchThread"; id: string; patch: Partial<Thread> }
  | { type: "addMessage"; threadId: string; msg: Partial<Message> & { from: Sender; text: string } }
  | { type: "addMessages"; threadId: string; msgs: (Partial<Message> & { from: Sender; text: string })[]; replace?: boolean }
  | { type: "patchMessage"; threadId: string; id: string; patch: Partial<Message> }
  | { type: "deleteMessage"; threadId: string; id: string }
  | { type: "moveMessage"; threadId: string; id: string; dir: -1 | 1 }
  | { type: "clearMessages"; threadId: string }
  | { type: "setDraft"; threadId: string; text: string }
  | { type: "patchSettings"; patch: Partial<Settings> }
  | { type: "setOverride"; platform: PlatformId; dark: boolean; key: keyof PlatformTheme; value: string | null }
  | { type: "resetOverrides"; platform: PlatformId }
  | { type: "storageError"; message: string | null }
  | { type: "importAll"; state: Pick<State, "threads" | "activeId" | "drafts" | "settings"> }
  | { type: "addThread"; thread: Thread }
  | { type: "notice"; label: string }
  | { type: "undo" }
  | { type: "redo" };

function touch(t: Thread): Thread {
  return { ...t, updatedAt: Date.now() };
}

function mapThread(state: State, id: string, fn: (t: Thread) => Thread): State {
  return { ...state, threads: state.threads.map((t) => (t.id === id ? touch(fn(t)) : t)) };
}

function normalizeMessage(m: Partial<Message> & { from: Sender; text: string }, fallbackTs: number): Message {
  return {
    id: m.id ?? uid(),
    from: m.from,
    text: m.text,
    ts: m.ts ?? fallbackTs,
    image: m.image,
    reaction: m.reaction,
    status: m.status,
    system: m.system,
  };
}

function baseReducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.state, loaded: true };

    case "newThread": {
      const now = Date.now();
      const t: Thread = {
        id: uid(),
        platform: action.platform,
        name: action.name ?? "New chat",
        handle: "",
        myName: "Me",
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, threads: [t, ...state.threads], activeId: t.id };
    }

    case "addThread":
      return { ...state, threads: [action.thread, ...state.threads], activeId: action.thread.id };

    case "notice":
      return { ...state, notice: { label: action.label, dir: "info", at: Date.now() } };

    case "deleteThread": {
      const threads = state.threads.filter((t) => t.id !== action.id);
      return {
        ...state,
        threads,
        activeId: state.activeId === action.id ? (threads[0]?.id ?? null) : state.activeId,
      };
    }

    case "setActive":
      return { ...state, activeId: action.id };

    case "patchThread":
      return mapThread(state, action.id, (t) => ({ ...t, ...action.patch }));

    case "addMessage":
      return mapThread(state, action.threadId, (t) => {
        const last = t.messages[t.messages.length - 1];
        const ts = action.msg.ts ?? Math.max(Date.now(), (last?.ts ?? 0) + 60000);
        return { ...t, messages: [...t.messages, normalizeMessage(action.msg, ts)] };
      });

    case "addMessages":
      return mapThread(state, action.threadId, (t) => {
        const base = action.replace ? [] : t.messages;
        const start = base[base.length - 1]?.ts ?? Date.now() - action.msgs.length * 60000;
        const added = action.msgs.map((m, i) => normalizeMessage(m, start + (i + 1) * 60000));
        return { ...t, messages: [...base, ...added] };
      });

    case "patchMessage":
      return mapThread(state, action.threadId, (t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      }));

    case "deleteMessage":
      return mapThread(state, action.threadId, (t) => ({
        ...t,
        messages: t.messages.filter((m) => m.id !== action.id),
      }));

    case "moveMessage":
      return mapThread(state, action.threadId, (t) => {
        const i = t.messages.findIndex((m) => m.id === action.id);
        const j = i + action.dir;
        if (i < 0 || j < 0 || j >= t.messages.length) return t;
        const messages = t.messages.slice();
        const a = messages[i];
        const b = messages[j];
        // swap position and timestamp so ordering stays consistent
        messages[i] = { ...b, ts: a.ts };
        messages[j] = { ...a, ts: b.ts };
        return { ...t, messages };
      });

    case "clearMessages":
      return mapThread(state, action.threadId, (t) => ({ ...t, messages: [] }));

    case "setDraft":
      return { ...state, drafts: { ...state.drafts, [action.threadId]: action.text } };

    case "patchSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "setOverride": {
      const k = `${action.platform}:${action.dark ? "dark" : "light"}`;
      const cur = { ...(state.settings.overrides[k] ?? {}) };
      if (action.value === null) delete cur[action.key];
      else cur[action.key] = action.value;
      const overrides = { ...state.settings.overrides, [k]: cur };
      if (!Object.keys(cur).length) delete overrides[k];
      return { ...state, settings: { ...state.settings, overrides } };
    }

    case "resetOverrides": {
      const overrides = { ...state.settings.overrides };
      delete overrides[`${action.platform}:light`];
      delete overrides[`${action.platform}:dark`];
      return { ...state, settings: { ...state.settings, overrides } };
    }

    case "storageError":
      return { ...state, storageError: action.message };

    case "importAll":
      // keep the history stacks so restoring a backup stays undoable
      return { ...state, ...action.state, loaded: true, storageError: null };

    default:
      return state;
  }
}

/**
 * What each action is worth in the undo history. Actions missing from here —
 * draft typing, view toggles, switching chats — aren't undoable steps: the
 * first is the textarea's own job, the rest aren't edits.
 *
 * `key` collapses a run of related edits (typing a message, dragging a colour
 * picker) into a single undo step instead of one per keystroke.
 */
function undoMeta(a: Action): { label: string; key?: string } | null {
  switch (a.type) {
    case "newThread":
      return { label: "new chat" };
    case "addThread":
      return { label: "opened shared chat" };
    case "deleteThread":
      return { label: "delete chat" };
    case "patchThread":
      return { label: "chat details", key: `thread:${a.id}:${Object.keys(a.patch).join()}` };
    case "addMessage":
      return { label: "add message" };
    case "addMessages":
      return { label: a.replace ? "replace thread" : "import messages" };
    case "patchMessage":
      return { label: "edit message", key: `msg:${a.id}:${Object.keys(a.patch).join()}` };
    case "deleteMessage":
      return { label: "delete message" };
    case "moveMessage":
      return { label: "move message" };
    case "clearMessages":
      return { label: "clear all messages" };
    case "setOverride":
      return { label: "colour", key: `colour:${a.platform}:${a.key}` };
    case "resetOverrides":
      return { label: "reset colours" };
    case "importAll":
      return { label: "restore backup" };
    default:
      return null;
  }
}

function snapshot(s: State, label: string, key: string): Snapshot {
  return {
    threads: s.threads,
    activeId: s.activeId,
    drafts: s.drafts,
    settings: s.settings,
    label,
    key,
    at: Date.now(),
  };
}

function restore(state: State, snap: Snapshot): Pick<State, "threads" | "activeId" | "drafts" | "settings"> {
  return {
    threads: snap.threads,
    activeId: snap.activeId,
    drafts: snap.drafts,
    settings: snap.settings,
  };
}

export function reducer(state: State, action: Action): State {
  if (action.type === "undo") {
    const prev = state.past[state.past.length - 1];
    if (!prev) return state;
    return {
      ...state,
      ...restore(state, prev),
      past: state.past.slice(0, -1),
      future: [snapshot(state, prev.label, prev.key), ...state.future].slice(0, HISTORY_LIMIT),
      notice: { label: prev.label, dir: "undo", at: Date.now() },
    };
  }

  if (action.type === "redo") {
    const next = state.future[0];
    if (!next) return state;
    return {
      ...state,
      ...restore(state, next),
      past: [...state.past, snapshot(state, next.label, next.key)].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
      notice: { label: next.label, dir: "redo", at: Date.now() },
    };
  }

  const meta = undoMeta(action);
  const next = baseReducer(state, action);
  if (!meta) return next;

  // A run of edits with the same key extends the step already on the stack,
  // so one Ctrl+Z undoes the whole edit rather than one character of it.
  const last = state.past[state.past.length - 1];
  const merge = !!(meta.key && last && last.key === meta.key && Date.now() - last.at < MERGE_MS);

  return {
    ...next,
    past: merge
      ? state.past.map((p, i) => (i === state.past.length - 1 ? { ...p, at: Date.now() } : p))
      : [...state.past, snapshot(state, meta.label, meta.key ?? "")].slice(-HISTORY_LIMIT),
    future: [],
    notice: null,
  };
}

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  thread: Thread | null;
  draft: string;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const firstWrite = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({
          type: "hydrate",
          state: {
            threads: parsed.threads ?? [],
            activeId: parsed.activeId ?? parsed.threads?.[0]?.id ?? null,
            drafts: parsed.drafts ?? {},
            settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
          },
        });
      } else {
        const t = seedThread();
        dispatch({ type: "hydrate", state: { threads: [t], activeId: t.id } });
      }
    } catch {
      const t = seedThread();
      dispatch({ type: "hydrate", state: { threads: [t], activeId: t.id } });
    }
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    if (firstWrite.current) {
      firstWrite.current = false;
    }
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            threads: state.threads,
            activeId: state.activeId,
            drafts: state.drafts,
            settings: state.settings,
          })
        );
        if (state.storageError) dispatch({ type: "storageError", message: null });
      } catch (e) {
        dispatch({
          type: "storageError",
          message:
            "Couldn't save — browser storage is full. Delete a thread with big screenshots to free space.",
        });
      }
    }, 250);
    return () => clearTimeout(id);
  }, [state.threads, state.activeId, state.drafts, state.settings, state.loaded]);

  // A link like #t=… carries a whole conversation. This also has to cope with
  // the link arriving while the app is already open: opening one then is a
  // same-document navigation, so nothing remounts and only hashchange fires.
  const lastPayload = useRef<string | null>(null);
  useEffect(() => {
    if (!state.loaded) return;
    let cancelled = false;

    const consume = async () => {
      const payload = readSharePayload();
      if (!payload || payload === lastPayload.current) return;
      lastPayload.current = payload;
      // Clear the hash before awaiting: decoding is async, and a second
      // listener firing in that gap would import the same link twice.
      clearShareHash();
      const shared = await decodeThread(payload);
      if (cancelled) return;
      if (shared) {
        dispatch({ type: "addThread", thread: shared });
        dispatch({ type: "notice", label: `Opened shared chat with ${shared.name}` });
      } else {
        dispatch({ type: "notice", label: "That shared link couldn't be read" });
      }
    };

    void consume();
    const onHash = () => void consume();
    window.addEventListener("hashchange", onHash);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHash);
    };
  }, [state.loaded]);

  const thread = useMemo(
    () => state.threads.find((t) => t.id === state.activeId) ?? state.threads[0] ?? null,
    [state.threads, state.activeId]
  );

  const value = useMemo<Ctx>(
    () => ({ state, dispatch, thread, draft: thread ? (state.drafts[thread.id] ?? "") : "" }),
    [state, thread]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Resolved theme for the active thread, with user colour overrides applied. */
export function useTheme(platformId: PlatformId) {
  const { state } = useStore();
  const platform = getPlatform(platformId);
  const mode = state.settings.theme;
  const dark = mode === "auto" ? platform.defaultDark : mode === "dark";
  const base = dark ? platform.dark : platform.light;
  const ov = state.settings.overrides[`${platformId}:${dark ? "dark" : "light"}`];
  const theme: PlatformTheme = ov ? { ...base, ...ov } : base;
  return { platform, theme, dark };
}

export { defaultSettings };

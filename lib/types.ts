export type Sender = "me" | "them";
export type Side = "out" | "in";

export type DeliveryStatus = "sending" | "sent" | "delivered" | "read";

export interface Message {
  id: string;
  from: Sender;
  text: string;
  /** epoch ms */
  ts: number;
  /** data URL of an attached image */
  image?: string;
  /** emoji reaction shown on the bubble */
  reaction?: string;
  /** only meaningful on the last outgoing message */
  status?: DeliveryStatus;
  /** renders as a system/date line instead of a bubble */
  system?: boolean;
}

export interface Thread {
  id: string;
  platform: PlatformId;
  /** the other person */
  name: string;
  handle: string;
  /** you */
  myName: string;
  avatar?: string;
  myAvatar?: string;
  /** Hinge: the prompt/photo you matched on */
  matchContext?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type PlatformId =
  | "imessage"
  | "whatsapp"
  | "instagram"
  | "hinge"
  | "telegram"
  | "messenger"
  | "sms"
  | "tinder"
  | "discord";

export type Engine =
  | "imessage"
  | "whatsapp"
  | "instagram"
  | "hinge"
  | "bubble"
  | "discord";

export interface PlatformTheme {
  bg: string;
  bgPattern?: string;
  headerBg: string;
  headerFg: string;
  headerSub: string;
  border: string;
  out: string;
  outFg: string;
  in: string;
  inFg: string;
  accent: string;
  meta: string;
  metaOut: string;
  tick: string;
  barBg: string;
  inputBg: string;
  inputFg: string;
  inputBorder: string;
  avatarBg: string;
}

export interface Platform {
  id: PlatformId;
  name: string;
  engine: Engine;
  os: "ios" | "android";
  font: "sf" | "roboto" | "serif";
  /** px */
  fontSize: number;
  radius: number;
  /** radius used on the "grouped" corner */
  tightRadius: number;
  /** max bubble width, % of screen */
  maxWidth: number;
  placeholder: string;
  headerStyle: "ios-center" | "android-left" | "instagram" | "hinge" | "discord";
  readReceipt: "text" | "ticks" | "avatar" | "none";
  /** timestamp rendered inside the bubble (WhatsApp / Telegram) */
  metaInBubble: boolean;
  tail: boolean;
  light: PlatformTheme;
  dark: PlatformTheme;
  defaultDark: boolean;
}

export type ThemeMode = "auto" | "light" | "dark";

export interface Settings {
  theme: ThemeMode;
  pov: Sender;
  /** which side the composer writes as */
  draftFrom: Sender;
  showFrame: boolean;
  showStatusBar: boolean;
  showTyping: boolean;
  showDraft: boolean;
  hour24: boolean;
  clockLabel: string;
  /** `${platformId}:light` | `${platformId}:dark` -> theme overrides */
  overrides: Record<string, Partial<Record<keyof PlatformTheme, string>>>;
}

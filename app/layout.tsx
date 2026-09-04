import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Roboto } from "next/font/google";
import "./globals.css";
import "./chat.css";
import RegisterSW from "@/components/RegisterSW";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Message Preview",
  description:
    "Draft a text and see exactly how it lands on their phone — iMessage, WhatsApp, Instagram, Hinge and more.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Message Preview" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0d11",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable} ${serif.variable}`}>
      {/* extensions like Grammarly add attributes to <body> before React loads */}
      <body suppressHydrationWarning>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

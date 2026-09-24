import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, JetBrains_Mono, Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  variable: "--font-atkinson",
  display: "swap",
  // next/font has no fallback metrics for this family (it only printed a build warning).
  adjustFontFallback: false,
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Human Loop: learn to supervise AI at work",
    template: "%s · Human Loop",
  },
  description:
    "AI agents are your new coworkers. Learn to supervise them. A free card game from DCI Resources: read the agent's plan, inspect the evidence, and make the call.",
  applicationName: "Human Loop",
  metadataBase: new URL("https://human-loop-eight.vercel.app"),
  openGraph: {
    title: "Human Loop: learn to supervise AI at work",
    description: "AI agents are your new coworkers. Learn to supervise them. A free card game from DCI Resources.",
    siteName: "Human Loop",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Human Loop: learn to supervise AI at work",
    description: "AI agents are your new coworkers. Learn to supervise them.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lexend.variable} ${atkinson.variable} ${jetbrains.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Human Loop — an AI Oversight Simulator by DCI",
  description:
    "Practice the skill every tech job will need: knowing when to trust an AI agent, and when to stop it. A free interactive simulator across DCI's 5 career pathways.",
  metadataBase: new URL("https://human-loop.vercel.app"),
  openGraph: {
    title: "Human Loop — an AI Oversight Simulator by DCI",
    description:
      "You're not competing with AI. You're supervising it. Play 5 career pathways, catch the agent's mistakes before they ship.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";

import { AppShell } from "../components/layout/app-shell";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-editorial",
});

export const metadata: Metadata = {
  title: "NEXA Core",
  description: "Production-grade SaaS foundation for NEXA Core.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${interTight.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

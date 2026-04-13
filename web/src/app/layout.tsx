import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MsalProvider } from "@/components/providers/MsalProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SessionLoader } from "@/components/auth/SessionLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "業務報告・指示",
  description: "業務報告・指示（SharePoint / Microsoft 365）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <MsalProvider>
          <SessionLoader />
          <AppShell>{children}</AppShell>
        </MsalProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AniMirok - Смотри аниме в лучшем качестве",
  description:
    "AniMirok - современная платформа для просмотра аниме онлайн в высоком качестве.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script id="deploy-debug-marker" strategy="afterInteractive">
          {`console.log("=== СБОРКА ОБНОВЛЕНА: ТЕСТ 1 ===");`}
        </Script>
        {children}
      </body>
    </html>
  );
}

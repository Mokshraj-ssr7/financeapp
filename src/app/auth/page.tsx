'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex items-center justify-center fixed top-4 left-1/2 -translate-x-1/2 z-50 gap-2 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-sm">
          <span className="text-xs text-muted-foreground">Dark</span>
          <Switch checked={dark} onCheckedChange={setDark} />
        </div>
        {children}
      </body>
    </html>
  );
}

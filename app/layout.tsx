import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/settings-provider";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Daily English News Reader",
  description: "A free daily English learning news website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <SettingsProvider>
          {children}
          <SiteFooter />
        </SettingsProvider>
      </body>
    </html>
  );
}

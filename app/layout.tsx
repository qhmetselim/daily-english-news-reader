import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/settings-provider";
import { SiteFooter } from "@/components/site-footer";
import { absoluteUrl, getSiteUrl, siteDescription, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName,
    title: siteName,
    description: siteDescription,
    url: absoluteUrl("/"),
    images: [
      {
        url: absoluteUrl("/study-newsroom.svg"),
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: [absoluteUrl("/study-newsroom.svg")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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

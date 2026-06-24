import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/header";
import { GreetingHero } from "@/components/greeting-hero";
import { LevelSelector } from "@/components/level-selector";
import { LocalizedText } from "@/components/localized-text";
import { absoluteUrl, siteDescription, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    type: "website",
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
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[72rem] flex-col items-center justify-center px-4 py-8 text-center sm:px-6 lg:min-h-[calc(100vh-88px)] lg:px-10">
        <div className="w-full">
          <GreetingHero />
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            <LocalizedText id="heroSubtitle" />
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/news"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-blue-700 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              <LocalizedText id="startReading" />
            </Link>
            <Link
              href="#level"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-200 bg-white/80 px-7 py-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
            >
              <LocalizedText id="chooseLevel" />
            </Link>
          </div>
        </div>

        <section className="premium-shell mt-8 w-full max-w-2xl rounded-[1.5rem] p-3 sm:rounded-[2rem] sm:p-4">
          <div id="level" className="premium-dark rounded-[1.25rem] p-4 text-white sm:rounded-[1.5rem] sm:p-5">
            <p className="text-sm uppercase text-blue-200">
              <LocalizedText id="yourStudySetup" />
            </p>
            <h2 className="mx-auto mt-3 max-w-xl text-xl font-semibold sm:text-2xl">
              <LocalizedText id="personalizeTitle" />
            </h2>
            <LevelSelector />
          </div>
        </section>
      </section>
    </main>
  );
}

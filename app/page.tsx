import Link from "next/link";
import { Header } from "@/components/header";
import { GreetingHero } from "@/components/greeting-hero";
import { LevelSelector } from "@/components/level-selector";
import { LocalizedText } from "@/components/localized-text";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[72rem] flex-col items-center justify-center px-10 py-8 text-center">
        <div className="w-full">
          <GreetingHero />
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-7 text-slate-600">
            <LocalizedText id="heroSubtitle" />
          </p>
          <div className="mt-7 flex items-center justify-center gap-4">
            <Link
              href="/news"
              className="rounded-full bg-blue-700 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              <LocalizedText id="startReading" />
            </Link>
            <Link
              href="#level"
              className="rounded-full border border-stone-200 bg-white/80 px-7 py-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
            >
              <LocalizedText id="chooseLevel" />
            </Link>
          </div>
        </div>

        <section className="premium-shell mt-8 w-full max-w-2xl rounded-[2rem] p-4">
          <div id="level" className="premium-dark rounded-[1.5rem] p-5 text-white">
            <p className="text-sm uppercase text-blue-200">
              <LocalizedText id="yourStudySetup" />
            </p>
            <h2 className="mx-auto mt-3 max-w-xl text-2xl font-semibold">
              <LocalizedText id="personalizeTitle" />
            </h2>
            <LevelSelector />
          </div>
        </section>
      </section>
    </main>
  );
}

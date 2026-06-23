"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/language-selector";
import { LocalizedText } from "@/components/localized-text";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#f7f5ef]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-[5.5rem] max-w-[88rem] items-center justify-between px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-lg font-semibold text-white shadow-lg shadow-slate-900/15">
            EN
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-950">
              Daily English News Reader by Ahmet
            </span>
            <span className="block text-sm text-slate-500">
              <LocalizedText id="brandTagline" />
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/news"
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/80 hover:text-slate-950 hover:shadow-sm"
          >
            <LocalizedText id="news" />
          </Link>
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}

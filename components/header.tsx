"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/language-selector";
import { LocalizedText } from "@/components/localized-text";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-[#f7f5ef]/90 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-20 max-w-[88rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:h-[5.5rem] lg:flex-nowrap lg:px-10 lg:py-0">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-slate-950 text-lg font-semibold text-white shadow-lg shadow-slate-900/15">
            EN
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-950 sm:text-base">
              Daily English News Reader by Ahmet
            </span>
            <span className="block truncate text-xs text-slate-500 sm:text-sm">
              <LocalizedText id="brandTagline" />
            </span>
          </span>
        </Link>

        <nav className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <Link
            href="/news"
            className="inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/80 hover:text-slate-950 hover:shadow-sm"
          >
            <LocalizedText id="news" />
          </Link>
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}

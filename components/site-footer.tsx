"use client";

import { LocalizedText } from "@/components/localized-text";

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[88rem] px-10 pb-8 pt-4">
      <p className="border-t border-stone-200/80 pt-5 text-center text-xs leading-5 text-slate-500">
        <LocalizedText id="educationalNotice" />
      </p>
    </footer>
  );
}

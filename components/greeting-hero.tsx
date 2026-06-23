"use client";

import { useEffect, useRef, useState } from "react";

const greetings = [
  "Hello",
  "Hola",
  "Bonjour",
  "Привет",
  "你好",
  "Hallo",
  "Ciao",
  "Merhaba",
  "こんにちは",
];

export function GreetingHero() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);
      timeoutRef.current = window.setTimeout(() => {
        setIndex((current) => (current + 1) % greetings.length);
        setVisible(true);
      }, 320);
    }, 5000);

    return () => {
      window.clearInterval(interval);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-32 flex-col items-center justify-center sm:min-h-40 lg:min-h-44">
      <p className="text-sm font-semibold uppercase text-blue-700/90">
        Daily English News Reader
      </p>
      <h1
        className={`mt-4 flex h-16 w-full max-w-5xl items-center justify-center text-center text-5xl font-semibold leading-none text-slate-950 transition-all duration-300 [text-shadow:0_18px_54px_rgba(15,23,42,0.1)] sm:h-24 sm:text-7xl md:h-28 md:text-8xl lg:h-[7.5rem] lg:text-[6.5rem] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {greetings[index]}
      </h1>
    </div>
  );
}

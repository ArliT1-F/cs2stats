import { useState, useRef, useEffect } from "react";
import { useCurrency, CURRENCIES, type CurrencyCode } from "../lib/currency";

// Tiny currency dropdown for the header. Persists via localStorage.

export function CurrencyPicker() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 border border-cs-border bg-cs-panel px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:border-cs-orange hover:text-cs-orange"
        title="Select display currency"
      >
        <span>{CURRENCIES[currency].symbol}</span>
        <span>{currency}</span>
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 max-h-[300px] w-44 overflow-y-auto border border-cs-border bg-cs-panel shadow-2xl">
          {(Object.entries(CURRENCIES) as Array<[CurrencyCode, typeof CURRENCIES[CurrencyCode]]>).map(([code, conf]) => (
            <button
              key={code}
              onClick={() => { setCurrency(code); setOpen(false); }}
              className={`flex w-full items-center justify-between border-b border-cs-border/40 px-3 py-1.5 text-left transition hover:bg-cs-bg ${
                currency === code ? "bg-cs-orange/10 text-cs-orange" : "text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-6 font-mono font-bold">{conf.symbol}</span>
                <span className="font-display text-xs font-bold">{code}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">{conf.name}</span>
            </button>
          ))}
          <div className="border-t border-cs-border bg-cs-bg/50 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-slate-600">
            // Approximate · for exact rates use Steam Market
          </div>
        </div>
      )}
    </div>
  );
}
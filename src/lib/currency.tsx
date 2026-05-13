import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// Currency context — lets the user pick a display currency that persists in
// localStorage. Affects the SkinsSection price displays.
//
// Note: BUFF163/Steam Market dumps return prices in USD. Real conversion would
// require a forex API; for now we apply a fixed approximate rate that's good
// enough for "ballpark" display. Users wanting exact prices should use Steam
// Market directly which serves prices in their account currency.

export const CURRENCIES = {
  USD: { symbol: "$",  name: "US Dollar",     rate: 1.00 },
  EUR: { symbol: "€",  name: "Euro",          rate: 0.92 },
  GBP: { symbol: "£",  name: "British Pound", rate: 0.79 },
  CAD: { symbol: "C$", name: "Canadian $",    rate: 1.36 },
  AUD: { symbol: "A$", name: "Australian $",  rate: 1.52 },
  SEK: { symbol: "kr", name: "Swedish Krona", rate: 10.5 },
  RUB: { symbol: "₽",  name: "Russian Ruble", rate: 92.0 },
  BRL: { symbol: "R$", name: "Brazilian Real",rate: 5.05 },
  PLN: { symbol: "zł", name: "Polish Złoty",  rate: 4.05 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  format: (usdAmount: number | null | undefined) => string;
}

const Ctx = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "cs2tracker:currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in CURRENCIES) setCurrencyState(saved as CurrencyCode);
    } catch {}
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try { localStorage.setItem(STORAGE_KEY, c); } catch {}
  };

  const format = (usdAmount: number | null | undefined): string => {
    if (usdAmount === null || usdAmount === undefined || !Number.isFinite(usdAmount)) return "—";
    const conf = CURRENCIES[currency];
    const converted = usdAmount * conf.rate;
    // For high-rate currencies (RUB, SEK) skip decimals
    const decimals = conf.rate >= 10 ? 0 : 2;
    return `${conf.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  return <Ctx.Provider value={{ currency, setCurrency, format }}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return v;
}
type AdvertisementPlacement = "landing" | "dashboard" | "section";

const AD_COPY: Record<AdvertisementPlacement, {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}> = {
  landing: {
    kicker: "Advertisement",
    title: "Gear up before your next queue",
    body: "Featured CS2 peripherals, coaching, and server partners can appear here.",
    cta: "Promote with CS2 Tracker",
    href: "mailto:ads@cs2tracker.example?subject=CS2%20Tracker%20advertising",
  },
  dashboard: {
    kicker: "Sponsored banner",
    title: "Your brand in the buy phase",
    body: "A first-party ad slot designed for stat tools, peripherals, servers, and coaching offers.",
    cta: "Reserve this slot",
    href: "mailto:ads@cs2tracker.example?subject=Dashboard%20ad%20slot",
  },
  section: {
    kicker: "Advertisement",
    title: "Improve faster with trusted CS2 partners",
    body: "Static sponsor placements keep the dashboard free without adding third-party trackers.",
    cta: "Learn about ads",
    href: "mailto:ads@cs2tracker.example?subject=Section%20ad%20slot",
  },
};

export function AdvertisementBanner({
  placement = "section",
  compact = false,
}: {
  placement?: AdvertisementPlacement;
  compact?: boolean;
}) {
  const ad = AD_COPY[placement];

  return (
    <aside
      className={`relative overflow-hidden border border-cs-blue/30 bg-gradient-to-r from-cs-blue/15 via-cs-panel to-cs-orange/10 clip-corner ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
      aria-label={ad.kicker}
    >
      <div className="absolute inset-0 tactical-grid opacity-20" />
      <div className="absolute -right-20 -top-24 h-48 w-48 rounded-full bg-cs-blue/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-cs-blue">
            // {ad.kicker}
          </div>
          <div className="mt-1 font-display text-xl font-bold uppercase tracking-tight text-white sm:text-2xl">
            {ad.title}
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">{ad.body}</p>
        </div>
        <a
          href={ad.href}
          className="inline-flex flex-shrink-0 items-center justify-center border border-cs-blue/50 bg-cs-blue/10 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-cs-blue transition hover:bg-cs-blue hover:text-cs-bg"
        >
          {ad.cta} ↗
        </a>
      </div>
    </aside>
  );
}

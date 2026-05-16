type AdPlacement = "landing" | "dashboard" | "section";

type AdSlotConfig = {
  label: string;
  format: string;
  minHeight: string;
  description: string;
};

const AD_SLOTS: Record<AdPlacement, AdSlotConfig> = {
  landing: {
    label: "Landing top banner",
    format: "Responsive display",
    minHeight: "min-h-[112px] sm:min-h-[128px]",
    description: "Reserved for the future AdSense landing-page unit.",
  },
  dashboard: {
    label: "Dashboard leaderboard",
    format: "Responsive leaderboard",
    minHeight: "min-h-[96px] sm:min-h-[112px]",
    description: "Reserved for the future AdSense dashboard unit.",
  },
  section: {
    label: "In-content banner",
    format: "Responsive in-feed",
    minHeight: "min-h-[88px]",
    description: "Reserved for a future AdSense in-content unit.",
  },
};

export function AdvertisementBanner({
  placement = "section",
  compact = false,
}: {
  placement?: AdPlacement;
  compact?: boolean;
}) {
  const slot = AD_SLOTS[placement];

  return (
    <aside
      className={`relative overflow-hidden border border-dashed border-cs-blue/35 bg-cs-panel/60 clip-corner ${slot.minHeight} ${
        compact ? "p-4" : "p-5 sm:p-6"
      }`}
      aria-label={`${slot.label} advertisement placeholder`}
      data-ad-provider="adsense"
      data-ad-status="placeholder"
      data-ad-placement={placement}
    >
      <div className="absolute inset-0 tactical-grid opacity-15" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cs-blue/60 to-transparent" />
      <div className="relative flex h-full min-h-[inherit] flex-col items-center justify-center gap-2 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-cs-blue">
          // AdSense placeholder
        </div>
        <div className="font-display text-lg font-bold uppercase tracking-tight text-slate-200 sm:text-xl">
          {slot.label}
        </div>
        <p className="max-w-2xl text-sm text-slate-500">
          {slot.description} No Google ad script, publisher id, or tracking code is loaded in this placeholder.
        </p>
        <div className="mt-1 border border-cs-border bg-cs-bg/60 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Format: {slot.format}
        </div>
      </div>
    </aside>
  );
}

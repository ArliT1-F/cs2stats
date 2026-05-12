import type { Profile, Stats, FaceitData } from "../lib/demoData";
import { OverviewSection } from "./OverviewSection";
import { WeaponsSection } from "./WeaponsSection";
import { MapsSection } from "./MapsSection";
import { FaceitSection } from "./FaceitSection";
import { ProfileBanner } from "./ProfileBanner";

export function Dashboard({
  profile,
  stats,
  faceit,
  isDemo,
}: {
  profile: Profile;
  stats: Stats;
  faceit: FaceitData | null;
  isDemo: boolean;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {isDemo && (
        <div className="mb-6 flex items-start gap-3 border border-cs-orange/40 bg-cs-orange/10 p-4 clip-corner">
          <svg className="h-5 w-5 flex-shrink-0 text-cs-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
          <div>
            <div className="font-display font-bold uppercase tracking-wider text-cs-orange">Demo Mode</div>
            <div className="text-sm text-slate-400">
              You're viewing simulated data. Sign in with Steam to see your real CS2 stats.
            </div>
          </div>
        </div>
      )}

      <ProfileBanner profile={profile} faceit={faceit} stats={stats} />

      <section id="overview" className="mt-10 scroll-mt-20">
        <SectionHeader number="01" title="Performance Overview" subtitle="Lifetime CS2 statistics" />
        <OverviewSection stats={stats} />
      </section>

      <section id="weapons" className="mt-12 scroll-mt-20">
        <SectionHeader number="02" title="Weapon Arsenal" subtitle="Kills, accuracy, and HS% per weapon" />
        <WeaponsSection weapons={stats.weapons} />
      </section>

      <section id="maps" className="mt-12 scroll-mt-20">
        <SectionHeader number="03" title="Map Performance" subtitle="Win-rate and rounds played" />
        <MapsSection maps={stats.maps} />
      </section>

      <section id="faceit" className="mt-12 scroll-mt-20">
        <SectionHeader number="04" title="Faceit Profile" subtitle="Competitive ranking & lifetime stats" />
        <FaceitSection faceit={faceit} />
      </section>

      <footer className="mt-16 border-t border-cs-border pt-6 text-center">
        <p className="font-mono text-xs text-slate-600">
          Data sourced from Steam Web API &amp; Faceit Open API · Updated live
        </p>
      </footer>
    </main>
  );
}

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-end justify-between border-b border-cs-border pb-3">
      <div>
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cs-orange">
          <span>{number}</span>
          <span className="h-px w-8 bg-cs-orange/40" />
          <span className="text-slate-500">{subtitle}</span>
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
      </div>
    </div>
  );
}

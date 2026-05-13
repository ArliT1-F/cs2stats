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
  demoReason,
  demoMessage,
}: {
  profile: Profile;
  stats: Stats;
  faceit: FaceitData | null;
  isDemo: boolean;
  demoReason?: string | null;
  demoMessage?: string | null;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      {isDemo && <DemoBanner reason={demoReason} message={demoMessage} />}

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

function DemoBanner({ reason, message }: { reason?: string | null; message?: string | null }) {
  // Map reason codes to actionable headlines + steps
  const guidance: Record<string, { title: string; steps: { label: string; href?: string }[] }> = {
    no_steam_key: {
      title: "Site owner: Steam API key not configured",
      steps: [
        { label: "Add STEAM_API_KEY env var on Vercel", href: "https://vercel.com/docs/environment-variables" },
        { label: "Get a key from steamcommunity.com/dev/apikey", href: "https://steamcommunity.com/dev/apikey" },
        { label: "Redeploy after adding env vars" },
      ],
    },
    private_profile: {
      title: "Your Steam profile is private",
      steps: [
        { label: "Open your Steam profile", href: "https://steamcommunity.com/my/edit/settings" },
        { label: "Edit Profile → Privacy Settings" },
        { label: "Set 'Game details' to PUBLIC" },
        { label: "Wait ~1 minute, then refresh this page" },
      ],
    },
    no_cs2_stats: {
      title: "No CS2 stats found for this account",
      steps: [
        { label: "Make sure you signed in with the Steam account that plays CS2" },
        { label: "Verify 'Game details' privacy is set to Public" },
        { label: "Play at least one CS2 match for stats to be tracked" },
      ],
    },
    empty_stats: {
      title: "Steam returned empty CS2 stats",
      steps: [
        { label: "This account hasn't played CS2 yet" },
        { label: "Or 'Game details' privacy is restricted" },
      ],
    },
    steam_api_error: {
      title: "Steam API returned an error",
      steps: [
        { label: "Check Vercel function logs for details" },
        { label: "Verify STEAM_API_KEY is valid" },
        { label: "Check if you're being rate-limited" },
      ],
    },
  };
  const g = reason ? guidance[reason] : null;
  return (
    <div className="mb-6 border border-cs-orange/40 bg-cs-orange/10 p-5 clip-corner">
      <div className="flex items-start gap-3">
        <svg className="h-5 w-5 flex-shrink-0 text-cs-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <div className="flex-1">
          <div className="font-display font-bold uppercase tracking-wider text-cs-orange">
            {g ? g.title : "Demo Mode"}
          </div>
          {message && <div className="mt-1 text-sm text-slate-300">{message}</div>}
          {!message && !g && (
            <div className="mt-1 text-sm text-slate-400">
              You're viewing simulated data. Sign in with Steam to see your real CS2 stats.
            </div>
          )}
          {g && (
            <ol className="mt-3 space-y-1 text-sm text-slate-300">
              {g.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-cs-orange/70">{i + 1}.</span>
                  {s.href ? (
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-cs-blue underline-offset-2 hover:underline">
                      {s.label} ↗
                    </a>
                  ) : (
                    <span>{s.label}</span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 font-mono text-[11px] text-slate-500">
            Need more info? Visit{" "}
            <a href="/api/debug" target="_blank" rel="noopener noreferrer" className="text-cs-blue hover:underline">
              /api/debug
            </a>{" "}
            for full diagnostics.
          </div>
        </div>
      </div>
    </div>
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

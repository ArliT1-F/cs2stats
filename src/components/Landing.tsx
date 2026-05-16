import { AdvertisementBanner } from "./AdvertisementBanner";

export function Landing({ onLogin, onDemo }: { onLogin: () => void; onDemo: () => void }) {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="tactical-grid relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cs-bg/40 to-cs-bg" />
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-cs-orange/10 blur-3xl" />
        <div className="absolute -right-32 top-40 h-72 w-72 rounded-full bg-cs-blue/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 border border-cs-orange/40 bg-cs-orange/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-cs-orange">
              <span className="h-1.5 w-1.5 rounded-full bg-cs-orange pulse-dot" />
              Live · Powered by Steam &amp; Faceit
            </div>
            <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-tight text-white sm:text-7xl">
              Master Your <span className="text-cs-orange text-glow">CS2</span>
              <br />
              <span className="text-slate-300">Performance</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
              Sign in with Steam to unlock deep Counter-Strike 2 analytics: accuracy,
              headshot %, weapon performance, map win-rates, and Faceit ELO — all in
              one tactical dashboard.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onLogin}
                className="group flex items-center gap-3 bg-cs-orange px-7 py-4 font-display text-base font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110 glow-orange clip-corner"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5 0 11.4l6.4 2.7c.5-.4 1.2-.6 1.9-.6h.2l2.9-4.2v-.1c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5h-.1l-4.1 3v.2c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4l-4.6-1.9C2.4 21 6.8 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0z" />
                </svg>
                Sign in through Steam
              </button>
              <button
                onClick={onDemo}
                className="border border-cs-border bg-cs-panel px-7 py-4 font-display text-base font-bold uppercase tracking-wider text-slate-200 transition hover:border-cs-orange hover:text-white clip-corner"
              >
                Try Live Demo →
              </button>
            </div>
            <p className="mt-4 font-mono text-xs text-slate-600">
              No password required · Steam OpenID 2.0 · We never see your credentials
            </p>
          </div>
        </div>
      </section>

      {/* Advertisement */}
      <section className="border-t border-cs-border bg-cs-bg py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AdvertisementBanner placement="landing" />
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-cs-border bg-cs-bg py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="mb-2 font-mono text-xs uppercase tracking-widest text-cs-orange">// FEATURES</div>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white">
              Everything You Need to Improve
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group relative border border-cs-border bg-cs-panel p-6 transition hover:border-cs-orange/60 clip-corner"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center bg-cs-orange/10 text-cs-orange transition group-hover:bg-cs-orange group-hover:text-cs-bg clip-corner">
                  {f.icon}
                </div>
                <h3 className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-white">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-cs-border bg-cs-panel/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="mb-2 font-mono text-xs uppercase tracking-widest text-cs-orange">// HOW IT WORKS</div>
            <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white">
              Three Steps to Insights
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="relative border border-cs-border bg-cs-bg p-6 clip-corner">
                <div className="font-mono text-5xl font-bold text-cs-orange/30">0{i + 1}</div>
                <h3 className="mt-2 font-display text-xl font-bold uppercase text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cs-border bg-cs-bg py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="font-mono text-xs text-slate-600">
            CS2 Tracker is not affiliated with Valve Corporation or Faceit. Counter-Strike 2 is a trademark of Valve.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Accuracy & HS%",
    desc: "Track your overall accuracy and headshot percentage across all engagements.",
    icon: <Crosshair />,
  },
  {
    title: "Weapon Mastery",
    desc: "See exactly which weapons you frag with most — AK, M4, AWP, and beyond.",
    icon: <Gun />,
  },
  {
    title: "Map Performance",
    desc: "Discover your best maps with win-rate, rounds played, and round-win breakdowns.",
    icon: <Map />,
  },
  {
    title: "K/D & Win Rate",
    desc: "Lifetime K/D ratio, MVPs, and round-win percentages computed from raw Steam data.",
    icon: <Trophy />,
  },
  {
    title: "Faceit ELO",
    desc: "Pulled directly from the Faceit API — current ELO, skill level, and match history.",
    icon: <Bolt />,
  },
  {
    title: "Bomb & Economy",
    desc: "Bombs planted/defused, money earned, MVPs and total hours played in CS2.",
    icon: <Bomb />,
  },
];

const steps = [
  { title: "Sign in with Steam", desc: "Secure OpenID 2.0 — your password never touches our servers." },
  { title: "We fetch your data", desc: "Steam Web API + Faceit API pull your CS2 stats in seconds." },
  { title: "Improve your game", desc: "Visualize trends, identify weaknesses, and dominate your next match." },
];

function Crosshair() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>); }
function Gun() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 11h12l3-3h3v3l-3 3h-3l-3 3H8l-2-2H3z"/></svg>); }
function Map() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>); }
function Trophy() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 4H4v3a3 3 0 0 0 3 3M17 4h3v3a3 3 0 0 1-3 3"/></svg>); }
function Bolt() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>); }
function Bomb() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="14" r="7"/><path d="m17 8 3-3M16 5h4v4"/></svg>); }

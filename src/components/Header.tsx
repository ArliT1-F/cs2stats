import type { Profile } from "../lib/demoData";

export function Header({
  profile,
  onLogin,
  onLogout,
  onDemo,
  isDemo,
}: {
  profile: Profile | null;
  onLogin: () => void;
  onLogout: () => void;
  onDemo: () => void;
  isDemo: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-cs-border bg-cs-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center bg-cs-orange font-display text-lg font-black text-cs-bg clip-corner">
              CS
            </div>
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-cs-orange pulse-dot" />
          </div>
          <div>
            <div className="font-display text-lg font-bold uppercase tracking-wider text-white">
              CS2 <span className="text-cs-orange">Tracker</span>
            </div>
            <div className="-mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Counter-Strike 2 Analytics
            </div>
          </div>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#overview" className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:text-cs-orange">
            Overview
          </a>
          <a href="#weapons" className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:text-cs-orange">
            Weapons
          </a>
          <a href="#maps" className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:text-cs-orange">
            Maps
          </a>
          <a href="#faceit" className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:text-cs-orange">
            Faceit
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <>
              <div className="hidden items-center gap-2 rounded border border-cs-border bg-cs-panel px-3 py-1.5 sm:flex">
                <img
                  src={profile.avatarfull}
                  alt={`${profile.personaname} avatar`}
                  className="h-7 w-7 rounded-sm border border-cs-border object-cover"
                />
                <div className="leading-tight">
                  <div className="font-display text-sm font-bold text-white">{profile.personaname}</div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {isDemo ? "DEMO MODE" : "STEAM AUTHENTICATED"}
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="font-display text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-cs-red"
              >
                {isDemo ? "Exit Demo" : "Logout"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onDemo}
                className="font-display text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-white"
              >
                Try Demo
              </button>
              <button
                onClick={onLogin}
                className="flex items-center gap-2 bg-cs-orange px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110 clip-corner"
              >
                <SteamIcon />
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SteamIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5 0 11.4l6.4 2.7c.5-.4 1.2-.6 1.9-.6h.2l2.9-4.2v-.1c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5h-.1l-4.1 3v.2c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4l-4.6-1.9C2.4 21 6.8 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zM7.5 18.2L6 17.6c.3.5.7 1 1.4 1.3 1.4.6 3 0 3.6-1.4.3-.7.3-1.5 0-2.2s-.9-1.2-1.6-1.5c-.7-.3-1.5-.3-2.1 0L8.9 14.5c1 .4 1.5 1.6 1 2.7-.3 1-1.4 1.5-2.4 1zm11.5-7.4c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3zm-5.2 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2z" />
    </svg>
  );
}
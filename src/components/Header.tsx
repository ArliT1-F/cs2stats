import type { Profile } from "../lib/demoData";
import { PlayerSearch } from "./PlayerSearch";
import { CurrencyPicker } from "./CurrencyPicker";

export function Header({
  profile,
  onLogin,
  onLogout,
  onDemo,
  isDemo,
  isPublicView,
}: {
  profile: Profile | null;
  onLogin: () => void;
  onLogout: () => void;
  onDemo: () => void;
  isDemo: boolean;
  isPublicView?: boolean;
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

        <nav className="hidden items-center gap-5 lg:flex">
          <NavGroup label="Steam" color="cs-blue">
            <NavLink href="#overview">Overview</NavLink>
            <NavLink href="#weapons">Weapons</NavLink>
            <NavLink href="#maps">Maps</NavLink>
            <NavLink href="#skins">Skins</NavLink>
          </NavGroup>
          <span className="text-cs-border">·</span>
          <NavGroup label="FACEIT" color="cs-orange">
            <NavLink href="#faceit">Profile</NavLink>
            <NavLink href="#faceit-maps">Maps</NavLink>
            <NavLink href="#matches">Matches</NavLink>
            <NavLink href="#demos">Demos</NavLink>
          </NavGroup>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global player search */}
          <div className="hidden md:block">
            <PlayerSearch />
          </div>
          {/* Currency picker */}
          <CurrencyPicker />

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
                    {isPublicView ? "PUBLIC VIEW" : isDemo ? "DEMO MODE" : "STEAM AUTH"}
                  </div>
                </div>
              </div>
              {isPublicView ? (
                <a
                  href="/"
                  className="font-display text-xs font-bold uppercase tracking-wider text-cs-orange transition hover:brightness-110"
                >
                  ← My Profile
                </a>
              ) : (
                <button
                  onClick={onLogout}
                  className="font-display text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-cs-red"
                >
                  {isDemo ? "Exit Demo" : "Logout"}
                </button>
              )}
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
                className="flex items-center gap-2 bg-cs-orange px-3 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110 clip-corner sm:px-4"
              >
                <SteamIcon />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavGroup({ label, color, children }: { label: string; color: "cs-blue" | "cs-orange"; children: React.ReactNode }) {
  const colorClass = color === "cs-blue" ? "text-cs-blue/70" : "text-cs-orange/70";
  return (
    <div className="flex items-center gap-3">
      <span className={`font-mono text-[10px] uppercase tracking-widest ${colorClass}`}>
        {label} //
      </span>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400 transition hover:text-cs-orange"
    >
      {children}
    </a>
  );
}

function SteamIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5 0 11.4l6.4 2.7c.5-.4 1.2-.6 1.9-.6h.2l2.9-4.2v-.1c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5h-.1l-4.1 3v.2c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4l-4.6-1.9C2.4 21 6.8 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zM7.5 18.2L6 17.6c.3.5.7 1 1.4 1.3 1.4.6 3 0 3.6-1.4.3-.7.3-1.5 0-2.2s-.9-1.2-1.6-1.5c-.7-.3-1.5-.3-2.1 0L8.9 14.5c1 .4 1.5 1.6 1 2.7-.3 1-1.4 1.5-2.4 1zm11.5-7.4c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3zm-5.2 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2z" />
    </svg>
  );
}
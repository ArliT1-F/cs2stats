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
    <header className="sticky top-0 z-40 border-b border-cs-border bg-cs-bg/90 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-h)] max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="relative flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center bg-cs-orange font-display text-base font-black text-cs-bg clip-corner sm:h-9 sm:w-9 sm:text-lg">
              CS
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-cs-orange pulse-dot sm:h-2 sm:w-2" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-base font-bold uppercase tracking-wider text-white sm:text-lg">
              CS2 <span className="text-cs-orange">Tracker</span>
            </div>
            <div className="hidden font-mono text-[10px] uppercase tracking-widest text-slate-500 sm:block">
              Counter-Strike 2 Analytics
            </div>
          </div>
        </a>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="hidden md:block">
            <PlayerSearch />
          </div>
          <CurrencyPicker />

          {profile ? (
            <>
              <div className="hidden items-center gap-2 rounded border border-cs-border bg-cs-panel px-2 py-1 md:flex">
                <img
                  src={profile.avatarfull}
                  alt=""
                  className="h-6 w-6 border border-cs-border object-cover"
                />
                <div className="max-w-[100px] leading-tight lg:max-w-[140px]">
                  <div className="truncate font-display text-xs font-bold text-white">{profile.personaname}</div>
                  <div className="font-mono text-[9px] text-slate-500">
                    {isPublicView ? "PUBLIC" : isDemo ? "DEMO" : "STEAM"}
                  </div>
                </div>
              </div>
              {isPublicView ? (
                <a
                  href="/"
                  className="px-1 font-display text-[10px] font-bold uppercase tracking-wider text-cs-orange sm:text-xs"
                >
                  <span className="hidden sm:inline">← My Profile</span>
                  <span className="sm:hidden">← Me</span>
                </a>
              ) : (
                <button
                  onClick={onLogout}
                  className="px-1 font-display text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-cs-red sm:text-xs"
                >
                  {isDemo ? "Exit" : "Logout"}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={onDemo}
                className="hidden font-display text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white sm:block"
              >
                Demo
              </button>
              <button
                onClick={onLogin}
                className="flex items-center gap-1.5 bg-cs-orange px-2.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-cs-bg transition hover:brightness-110 clip-corner sm:px-3 sm:py-2 sm:text-sm"
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

function SteamIcon() {
  return (
    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5 0 11.4l6.4 2.7c.5-.4 1.2-.6 1.9-.6h.2l2.9-4.2v-.1c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5-2 4.5-4.5 4.5h-.1l-4.1 3v.2c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4l-4.6-1.9C2.4 21 6.8 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zM7.5 18.2L6 17.6c.3.5.7 1 1.4 1.3 1.4.6 3 0 3.6-1.4.3-.7.3-1.5 0-2.2s-.9-1.2-1.6-1.5c-.7-.3-1.5-.3-2.1 0L8.9 14.5c1 .4 1.5 1.6 1 2.7-.3 1-1.4 1.5-2.4 1zm11.5-7.4c0-1.7-1.3-3-3-3s-3 1.3-3 3 1.3 3 3 3 3-1.3 3-3zm-5.2 0c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2-1 2.2-2.2 2.2-2.2-1-2.2-2.2z" />
    </svg>
  );
}

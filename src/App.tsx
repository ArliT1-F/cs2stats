import { useEffect, useState, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Header } from "./components/Header";
import { Landing } from "./components/Landing";
import { Dashboard } from "./components/Dashboard";
import { LiveStatusBanner } from "./components/LiveStatusBanner";
import { DebugOverlay } from "./components/DebugOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CurrencyProvider } from "./lib/currency";
import {
  generateDemoStats,
  generateDemoProfile,
  generateDemoFaceit,
  type Profile,
  type Stats,
  type FaceitData,
} from "./lib/demoData";

interface Session {
  profile: Profile;
  stats: Stats;
  faceit: FaceitData | null;
  isDemo: boolean;
  isPublicView?: boolean; // true when viewing /u/{steamid} (someone else's profile)
  demoReason?: string | null;
  demoMessage?: string | null;
}

// Tiny client-side router. Recognizes:
//   /              → own dashboard (or landing if logged out)
//   /u/{steamid}   → public profile of another player
function parseRoute(): { kind: "home" } | { kind: "profile"; steamId: string } {
  const path = window.location.pathname;
  const profileMatch = path.match(/^\/u\/(7656119\d{10})\/?$/);
  if (profileMatch) return { kind: "profile", steamId: profileMatch[1] };
  return { kind: "home" };
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [route, setRoute] = useState(parseRoute());

  // Listen for back/forward navigation
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Handle auth callback URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    if (authStatus === "failed") {
      setAuthError("Steam sign-in failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (authStatus === "success") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch the right session based on route
  useEffect(() => {
    if (route.kind === "profile") {
      fetchPublicProfile(route.steamId);
    } else {
      fetchSession();
    }
  }, [route]);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/me", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setSession({
          profile: data.profile,
          stats: data.stats,
          faceit: data.faceit,
          isDemo: !!data.usedDemo,
          demoReason: data.demoReason,
          demoMessage: data.demoMessage,
        });
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPublicProfile = useCallback(async (steamId: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/profile/${steamId}`);
      if (r.ok) {
        const data = await r.json();
        setSession({
          profile: data.profile,
          stats: data.stats,
          faceit: data.faceit,
          isDemo: !!data.usedDemo,
          demoReason: data.demoReason,
          isPublicView: true,
        });
      } else {
        setSession(null);
        setAuthError(`Profile ${steamId} not found or not public.`);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(() => {
    window.location.href = "/api/auth/steam";
  }, []);

  const handleLogout = useCallback(async () => {
    if (session?.isDemo) {
      setSession(null);
      window.history.pushState({}, "", "/");
      setRoute({ kind: "home" });
      return;
    }
    try {
      await fetch("/api/auth/logout");
    } catch {}
    setSession(null);
    window.history.pushState({}, "", "/");
    setRoute({ kind: "home" });
  }, [session]);

  const handleDemo = useCallback(() => {
    const seed = "demo-" + Math.random().toString(36).slice(2, 8);
    setSession({
      profile: generateDemoProfile(seed),
      stats: generateDemoStats(seed),
      faceit: generateDemoFaceit(seed),
      isDemo: true,
    });
    setAuthError(null);
    setTimeout(() => {
      document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  return (
    <CurrencyProvider>
      <DebugOverlay session={session} loading={loading} route={route} />
      <div className={`min-h-screen bg-cs-bg text-slate-200 ${session?.isDemo ? "demo-mode" : ""}`}>
        {/* Persistent DEMO MODE indicator — thin orange stripe along the top edge */}
        {session?.isDemo && <DemoModeStripe />}

        <ErrorBoundary label="Header">
          <Header
            profile={session?.profile || null}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onDemo={handleDemo}
            isDemo={!!session?.isDemo}
            isPublicView={!!session?.isPublicView}
          />
        </ErrorBoundary>

        {authError && (
          <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
            <div className="border border-cs-red/40 bg-cs-red/10 px-4 py-3 text-sm text-cs-red clip-corner">
              {authError}
            </div>
          </div>
        )}

        {loading ? (
          <LoadingScreen />
        ) : session ? (
          <>
            {/* Live status banner — only on own profile (not public view) */}
            {!session.isPublicView && (
              <div className="mx-auto mt-2 max-w-7xl px-4 sm:px-6">
                <ErrorBoundary label="LiveStatusBanner">
                  <LiveStatusBanner steamId={session.profile.steamid} isDemo={session.isDemo} />
                </ErrorBoundary>
              </div>
            )}
            <ErrorBoundary label="Dashboard">
              <Dashboard
                profile={session.profile}
                stats={session.stats}
                faceit={session.faceit}
                isDemo={session.isDemo}
                isPublicView={!!session.isPublicView}
                demoReason={session.demoReason || null}
                demoMessage={session.demoMessage || null}
              />
            </ErrorBoundary>
          </>
        ) : (
          <Landing onLogin={handleLogin} onDemo={handleDemo} />
        )}
      </div>
      <Analytics />
    </CurrencyProvider>
  );
}

function DemoModeStripe() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1.5 bg-gradient-to-r from-cs-orange via-amber-300 to-cs-orange">
      <div className="absolute right-3 top-1.5 bg-cs-orange px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-widest text-cs-bg">
        ⚠ DEMO MODE
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin border-2 border-cs-orange border-t-transparent" />
        <div className="font-mono text-xs uppercase tracking-widest text-cs-orange">
          // FETCHING TACTICAL DATA
        </div>
      </div>
    </div>
  );
}

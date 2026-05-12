import { useEffect, useState, useCallback } from "react";
import { Header } from "./components/Header";
import { Landing } from "./components/Landing";
import { Dashboard } from "./components/Dashboard";
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
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // On mount: check URL for auth callback, otherwise check /api/me for existing session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    if (authStatus === "failed") {
      setAuthError("Steam sign-in failed. Please try again.");
      window.history.replaceState({}, "", "/");
    } else if (authStatus === "success") {
      window.history.replaceState({}, "", "/");
    }

    fetchSession();
  }, []);

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
        });
      } else {
        setSession(null);
      }
    } catch {
      // API not available (e.g. local single-file build) — stay logged out
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
      return;
    }
    try {
      await fetch("/api/auth/logout");
    } catch {}
    setSession(null);
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
    <div className="min-h-screen bg-cs-bg text-slate-200">
      <Header
        profile={session?.profile || null}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onDemo={handleDemo}
        isDemo={!!session?.isDemo}
      />

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
        <Dashboard
          profile={session.profile}
          stats={session.stats}
          faceit={session.faceit}
          isDemo={session.isDemo}
        />
      ) : (
        <Landing onLogin={handleLogin} onDemo={handleDemo} />
      )}
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
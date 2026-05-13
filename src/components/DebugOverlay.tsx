import { useEffect, useRef, useState } from "react";

// On-page debug overlay. Shows the build timestamp + a render counter +
// session state. Critical for diagnosing "blank after auth" bugs because the
// browser console is hard to access on mobile and refresh-cycles wipe DevTools.
//
// Toggle with the "D" key, or via the orange "[debug]" button in the bottom-
// right corner. Persists state in localStorage so it survives reloads.

const STORAGE = "cs2tracker:debug";
// Build timestamp injected at build time via Vite's define. Falls back to
// a runtime ISO string if not set (e.g. during dev).
const BUILD_TS = (typeof __BUILD_TS__ !== "undefined" ? __BUILD_TS__ : new Date().toISOString());

declare const __BUILD_TS__: string;

export function DebugOverlay({ session, loading, route }: {
  session: any;
  loading: boolean;
  route: any;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE) === "1"; } catch { return false; }
  });
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
        setOpen((o) => {
          const next = !o;
          try { localStorage.setItem(STORAGE, next ? "1" : "0"); } catch {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Even when collapsed, show the build timestamp + render counter as a tiny
  // always-visible chip. Critical for diagnosing "stale cache" vs "real bug".
  // The build timestamp is the FIRST thing to check when the screen goes blank.
  const buildShort = BUILD_TS.slice(11, 19); // "HH:MM:SS" UTC
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); try { localStorage.setItem(STORAGE, "1"); } catch {} }}
        className="fixed bottom-2 right-2 z-[70] flex items-center gap-1.5 bg-cs-bg/90 border border-cs-orange/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-cs-orange hover:bg-cs-orange hover:text-cs-bg"
        title={`Build: ${BUILD_TS}\nRender #${renderCount.current}\nClick or press D for full debug`}
      >
        <span className="opacity-60">b:{buildShort}</span>
        <span className="opacity-40">·</span>
        <span>r:{renderCount.current}</span>
        <span className="opacity-40">·</span>
        <span>debug</span>
      </button>
    );
  }

  const sessionSummary = !session
    ? "null"
    : `{ profile: ${session.profile?.personaname || "?"}, isDemo: ${session.isDemo}, isPublic: ${session.isPublicView}, faceit: ${session.faceit ? "yes" : "no"}, demoReason: ${session.demoReason || "none"} }`;
  // Read the global error log populated by ErrorBoundary so the user can see
  // which section(s) crashed without scrolling around looking for red cards.
  const errors = (() => {
    try {
      const w = window as unknown as { __cs2_errors?: Array<{ boundary: string; name: string; message: string }> };
      return w.__cs2_errors || [];
    } catch { return []; }
  })();

  return (
    <div className="fixed bottom-2 right-2 z-[70] max-w-[320px] border border-cs-orange/60 bg-cs-bg/95 p-2 font-mono text-[10px] text-slate-300 backdrop-blur">
      <div className="mb-1 flex items-center justify-between gap-2 border-b border-cs-border pb-1">
        <span className="font-bold uppercase tracking-widest text-cs-orange">// DEBUG</span>
        <button
          onClick={() => { setOpen(false); try { localStorage.setItem(STORAGE, "0"); } catch {} }}
          className="text-slate-500 hover:text-cs-red"
        >
          ✕
        </button>
      </div>
      <div className="space-y-0.5 break-all">
        <div><span className="text-slate-500">build:</span> {BUILD_TS}</div>
        <div><span className="text-slate-500">render#:</span> {renderCount.current}</div>
        <div><span className="text-slate-500">loading:</span> {String(loading)}</div>
        <div><span className="text-slate-500">route:</span> {route.kind}{route.steamId ? ` (${route.steamId.slice(-6)})` : ""}</div>
        <div><span className="text-slate-500">session:</span> {sessionSummary}</div>
        <div><span className="text-slate-500">ua:</span> <span className="text-slate-600">{navigator.userAgent.slice(0, 60)}…</span></div>
        {errors.length > 0 && (
          <div className="mt-2 border-t border-cs-red/40 pt-2">
            <div className="font-bold text-cs-red">⚠ ERRORS ({errors.length}):</div>
            {errors.map((e, i) => (
              <div key={i} className="mt-1 border-l-2 border-cs-red/60 pl-1.5">
                <div className="text-cs-red font-bold">[{e.boundary}]</div>
                <div className="text-slate-400 break-all">{e.name}: {e.message.slice(0, 120)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1 border-t border-cs-border pt-1 font-mono text-[9px] text-slate-600">
        Press D to hide. If render# climbs rapidly, there's an infinite loop.
      </div>
    </div>
  );
}

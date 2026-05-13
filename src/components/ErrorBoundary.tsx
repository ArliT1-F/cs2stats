import { Component, type ReactNode, type ErrorInfo } from "react";

// Catches runtime errors anywhere in the render tree and shows a useful
// error screen instead of a blank page. Critical for mobile debugging where
// the developer console is hard to access.
//
// In production, browsers don't show the JS console by default, so an
// uncaught render error becomes a totally blank screen. With this boundary,
// users see the actual error message they can screenshot and report.

interface Props { children: ReactNode }
interface State { error: Error | null; info: ErrorInfo | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
    // Also log so it shows in remote debug consoles
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    const e = this.state.error;
    return (
      <div className="min-h-screen bg-cs-bg p-4 text-slate-200 sm:p-8">
        <div className="mx-auto max-w-2xl border border-cs-red/60 bg-cs-panel p-5 clip-corner">
          <div className="font-mono text-xs uppercase tracking-widest text-cs-red">
            // RUNTIME ERROR
          </div>
          <div className="mt-2 font-display text-xl font-bold text-white">
            Something broke during render
          </div>
          <div className="mt-3 break-words border-l-2 border-cs-red/60 bg-cs-bg/60 p-3 font-mono text-sm text-cs-red">
            {e.name}: {e.message}
          </div>
          {e.stack && (
            <details className="mt-3">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-slate-400">
                Stack trace (tap to expand)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words border border-cs-border bg-cs-bg p-2 font-mono text-[10px] text-slate-400">
                {e.stack}
              </pre>
            </details>
          )}
          {this.state.info?.componentStack && (
            <details className="mt-2">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-slate-400">
                Component stack
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words border border-cs-border bg-cs-bg p-2 font-mono text-[10px] text-slate-400">
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={this.reset}
              className="bg-cs-orange px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-cs-bg"
            >
              Try Again
            </button>
            <a
              href="/"
              className="border border-cs-border bg-cs-panel px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-slate-300 hover:border-cs-orange"
            >
              Reload
            </a>
          </div>
        </div>
      </div>
    );
  }
}
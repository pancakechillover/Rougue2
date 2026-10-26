import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Home,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown in the fallback so the user knows which area broke. */
  label?: string;
  /** Called when the user presses "Try again" — usually resets the surrounding view state. */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

const VALID_THEMES = new Set(['night', 'forest', 'ocean', 'daylight', 'warm', 'candy']);

function resolveSavedTheme(): string {
  if (typeof document === 'undefined') return 'daylight';
  const currentAttr = document.documentElement.getAttribute('data-theme');
  if (currentAttr && VALID_THEMES.has(currentAttr)) {
    return currentAttr;
  }

  try {
    const keys = ['scholars_dungeon_state', 'scholars_dungeon_state__backup_raw'];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed?.theme && VALID_THEMES.has(parsed.theme)) {
        return parsed.theme;
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return 'daylight';
}

function ensureDocumentTheme(): string {
  const theme = resolveSavedTheme();
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  return theme;
}

/**
 * Catches render errors so a single broken component does not take down the
 * whole app. Used twice: once around <App/> in main.tsx, and once per page in
 * App.tsx (keyed by active tab, so switching pages resets the error).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    ensureDocumentTheme();
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    ensureDocumentTheme();
    this.setState({ componentStack: info.componentStack || null });
    console.error('[ErrorBoundary]', this.props.label || 'app', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null, componentStack: null, copied: false });
    this.props.onReset?.();
  };

  private handleCopyDiagnostics = () => {
    const details = [
      this.state.error?.name ? `${this.state.error.name}: ${this.state.error.message}` : this.state.error?.message,
      this.state.componentStack
    ]
      .filter(Boolean)
      .join('\n');

    if (!details) return;
    navigator.clipboard?.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(() => {});
  };

  private handleExport = () => {
    try {
      const dump: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('scholars_')) continue;
        const raw = localStorage.getItem(key) || '';
        try {
          dump[key] = JSON.parse(raw);
        } catch {
          dump[key] = raw;
        }
      }

      const blob = new Blob(
        [JSON.stringify({ exportedAt: new Date().toISOString(), data: dump }, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scholars-dungeon-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ErrorBoundary] export failed', err);
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    ensureDocumentTheme();
    const isRootBoundary = this.props.label === 'The application';

    return (
      <div
        className={
          isRootBoundary
            ? 'min-h-screen w-full bg-slate-950 text-slate-200 flex items-center justify-center p-4 sm:p-6'
            : 'min-h-[60vh] w-full flex items-center justify-center p-4 sm:p-6'
        }
      >
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-5">
          {/* Theme-aware Ambient Glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
                <ShieldAlert size={26} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <AlertTriangle size={11} />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-[10px] font-black uppercase tracking-widest text-indigo-400">
              <span>Sanctum Ward Triggered</span>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white uppercase tracking-tight italic pr-1">
                Something Broke Here
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                {this.props.label ? `${this.props.label} encountered an unexpected interruption.` : 'This section encountered an unexpected interruption.'}{' '}
                Your local progress and archives remain safe.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.99]"
            >
              <RotateCcw size={14} />
              <span>Try Again</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                <Home size={14} className="text-indigo-400" />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleExport}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs font-bold transition-colors"
              >
                <Download size={14} className="text-indigo-400" />
                <span>Export Data</span>
              </button>
            </div>
          </div>

          <details className="relative z-10 group rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden text-left">
            <summary className="px-3.5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 cursor-pointer select-none flex items-center justify-between transition-colors">
              <span>Technical Diagnostics</span>
              <span className="text-[9px] font-mono text-slate-500 group-open:text-indigo-400">
                Inspect
              </span>
            </summary>
            <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold text-indigo-400 truncate">
                  {this.state.error.name || 'RuntimeError'}
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyDiagnostics}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition-colors shrink-0"
                >
                  {this.state.copied ? (
                    <>
                      <Check size={11} className="text-indigo-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} className="text-indigo-400" />
                      <span>Copy Log</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="max-h-36 overflow-auto custom-scrollbar rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 text-[10px] font-mono leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
                {this.state.error.message}
                {this.state.componentStack}
              </pre>
            </div>
          </details>
        </div>
      </div>
    );
  }
}


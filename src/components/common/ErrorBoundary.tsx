import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Download, Home, RotateCcw } from 'lucide-react';

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
}

/**
 * Catches render errors so a single broken component does not take down the
 * whole app. Used twice: once around <App/> in main.tsx, and once per page in
 * App.tsx (keyed by active tab, so switching pages resets the error).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * This repo has no @types/react installed (see ROADMAP P0-3), so React's
   * class members resolve to `any` and TS cannot see setState/props on `this`.
   * These declarations restore them without changing runtime behaviour.
   */
  declare props: ErrorBoundaryProps;
  declare context: unknown;
  declare forceUpdate: (callback?: () => void) => void;
  declare setState: (
    state:
      | Partial<ErrorBoundaryState>
      | ((prev: ErrorBoundaryState) => Partial<ErrorBoundaryState>)
  ) => void;

  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack || null });
    console.error('[ErrorBoundary]', this.props.label || 'app', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null, componentStack: null });
    this.props.onReset?.();
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

    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle size={22} className="text-rose-400" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-100">Something broke here</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {this.props.label ? `${this.props.label} failed to render.` : 'This section failed to render.'}{' '}
              Your data is safe — nothing has been deleted.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              <RotateCcw size={14} />
              <span>Try again</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              <Home size={14} />
              <span>Reload the app</span>
            </button>

            <button
              type="button"
              onClick={this.handleExport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
            >
              <Download size={14} />
              <span>Export my data</span>
            </button>
          </div>

          <details className="text-left">
            <summary className="text-[10px] font-bold text-slate-500 cursor-pointer select-none">
              Technical details
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap break-words">
              {this.state.error.message}
              {this.state.componentStack}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

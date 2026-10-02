import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DigiSkool Portal Error Boundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-white rounded-2xl border border-rose-200 shadow-sm max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 bg-rose-100 text-[#6E1231] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Something went wrong in this section</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            {this.state.error?.message || 'An unexpected issue occurred while rendering the portal dashboard.'}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#6E1231] hover:bg-[#85173A] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              Reload Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

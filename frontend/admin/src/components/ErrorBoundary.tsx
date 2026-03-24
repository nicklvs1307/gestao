import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 p-8">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 text-2xl font-black">
            !
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase italic">Algo deu errado</h2>
          <p className="text-xs text-slate-400 font-bold uppercase max-w-md text-center">
            {this.state.error?.message || 'Erro inesperado. Tente recarregar a página.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

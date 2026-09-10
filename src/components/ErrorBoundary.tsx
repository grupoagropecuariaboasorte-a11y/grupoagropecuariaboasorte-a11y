// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-xl mx-auto my-8 bg-white border border-red-200 rounded-2xl shadow-xs text-center">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">
            {this.props.fallbackTitle || 'Falha ao carregar o módulo'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Ocorreu uma instabilidade pontual na exibição deste módulo. Os seus dados no banco de dados continuam intactos e preservados.
          </p>
          {this.state.error && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-[11px] font-mono text-red-700 mb-4 overflow-x-auto">
              {this.state.error.message}
            </div>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 bg-[#1B3022] hover:bg-[#254230] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw size={14} /> Recarregar tela
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

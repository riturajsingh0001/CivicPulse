import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const _this = this as any;
    const props = _this.props;
    if (this.state.hasError) {
      return props.fallback || (
        <div className="p-8 text-center text-red-400 bg-red-500/10 rounded-2xl border border-red-500/30">
          Unable to render report. Please try again.
        </div>
      );
    }

    return props.children;
  }
}

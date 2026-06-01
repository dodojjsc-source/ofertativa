import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        Promise.all(regs.map((r) => r.unregister())).finally(() => {
          window.location.reload();
        });
      });
    } else {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-sm p-6 space-y-4">
          <h1 className="text-xl font-bold text-foreground">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            A tela travou ao carregar. Atualize a página, se persistir, faça login de novo.
          </p>
          {this.state.error && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}

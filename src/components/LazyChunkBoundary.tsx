import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  /** Short label used in the friendly fallback heading (e.g. "map", "neighborhood"). */
  label?: string;
  /** Optional compact variant for inline regions. */
  compact?: boolean;
};

type State = { hasError: boolean };

/**
 * Catches lazy-import / chunk-load failures (common after deploys when an
 * old client requests a hashed chunk that no longer exists) and shows a
 * friendly retry screen instead of a blank page.
 */
export class LazyChunkBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") {
      console.error("[LazyChunkBoundary] Failed to load chunk:", error, info);
    }
  }

  private handleRetry = () => {
    // A hard reload is the safest recovery for a missing/stale hashed chunk.
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      this.setState({ hasError: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { label = "this section", compact } = this.props;
    const padding = compact ? "py-8 px-4" : "py-16 px-6";

    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center text-center ${padding} rounded-xl border border-border bg-card shadow-soft`}
      >
        <div className="p-3 rounded-full bg-primary/10 mb-3">
          <AlertTriangle className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          We couldn't load {label}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          This usually happens after an update or a brief network hiccup. Refreshing the page should fix it.
        </p>
        <Button size="sm" onClick={this.handleRetry} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }
}

export default LazyChunkBoundary;

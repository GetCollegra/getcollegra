import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    document.title = "Unsubscribe — Collegra";
  }, []);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "This unsubscribe link is missing a token." });
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
        const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: supabaseAnonKey } },
        );
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.valid === true) setState({ kind: "valid" });
        else if (json.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid", message: json.error ?? "Invalid or expired link." });
      } catch {
        setState({ kind: "invalid", message: "Could not reach the server. Please try again." });
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setState({ kind: "error", message: error.message ?? "Something went wrong." });
        return;
      }
      if (data?.success) setState({ kind: "success" });
      else if (data?.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: "Unable to process your request." });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Unexpected error." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <main className="w-full max-w-md bg-card border rounded-2xl shadow-soft p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Email preferences</h1>

        {state.kind === "loading" && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </div>
        )}

        {state.kind === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              Click below to unsubscribe from Collegra emails. You'll stop receiving updates immediately.
            </p>
            <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            <p className="text-xs text-muted-foreground mt-4">
              Note: critical account emails (e.g. password resets) will still be delivered.
            </p>
          </>
        )}

        {state.kind === "submitting" && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </div>
        )}

        {state.kind === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium mb-1">You're unsubscribed</p>
            <p className="text-sm text-muted-foreground mb-6">
              We won't send you any more marketing emails. We're sorry to see you go.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Back to Collegra</Link>
            </Button>
          </>
        )}

        {state.kind === "already" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-medium mb-1">Already unsubscribed</p>
            <p className="text-sm text-muted-foreground mb-6">
              This email address is already opted out — no further action needed.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Back to Collegra</Link>
            </Button>
          </>
        )}

        {(state.kind === "invalid" || state.kind === "error") && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="font-medium mb-1">Something went wrong</p>
            <p className="text-sm text-muted-foreground mb-6">{state.message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Back to Collegra</Link>
            </Button>
          </>
        )}
      </main>
    </div>
  );
};

export default Unsubscribe;

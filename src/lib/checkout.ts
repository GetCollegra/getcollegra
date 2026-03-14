import { supabase } from "@/integrations/supabase/client";
import { capture } from "@/lib/posthog";

export async function startCheckout(toast: (opts: { title: string; description: string; variant?: "default" | "destructive" }) => void) {
  capture("checkout_started");
  const checkoutWindow = window.open("about:blank", "_blank");
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      checkoutWindow?.close();
      toast({ title: "Sign in required", description: "Please sign in to subscribe.", variant: "destructive" });
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Checkout failed");

    if (data?.url && checkoutWindow) {
      checkoutWindow.location.href = data.url;
    } else if (data?.url) {
      window.location.href = data.url;
    } else {
      checkoutWindow?.close();
    }
  } catch (err) {
    checkoutWindow?.close();
    toast({
      title: "Error",
      description: err instanceof Error ? err.message : "Could not start checkout. Please try again.",
      variant: "destructive",
    });
  }
}

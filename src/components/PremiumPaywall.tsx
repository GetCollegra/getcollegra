import { useState } from "react";
import { Lock, Crown, BarChart3, StickyNote, Sparkles, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { capture } from "@/lib/posthog";
import { startCheckout } from "@/lib/checkout";
import { useAuth } from "@/contexts/AuthContext";

const premiumFeatures = [
  { icon: BarChart3, label: "Side-by-side college comparison" },
  { icon: StickyNote, label: "Personal notes for each school" },
  { icon: Sparkles, label: "AI-powered insights & recommendations" },
  { icon: MapPin, label: "Interactive college map" },
];

export default function PremiumPaywall() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isSubscribed } = useAuth();

  const handleUpgrade = async () => {
    capture("premium_clicked", { source: "paywall" });
    setLoading(true);
    try {
      await startCheckout(toast, { isSubscribed });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary w-full" />
      <CardContent className="p-8 md:p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <Badge className="bg-accent/10 text-accent border-0 mb-4 gap-1.5 px-3 py-1">
          <Crown className="h-3.5 w-3.5" /> Premium Feature
        </Badge>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Unlock Collegra Premium
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Get the full toolkit to organize, compare, and make confident college decisions — for just $9.99/month.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-8">
          {premiumFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex items-center gap-3 text-left p-3 rounded-xl bg-muted/40 border border-border/50"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{f.label}</span>
              </div>
            );
          })}
        </div>

        <Button
          size="xl"
          variant="hero"
          className="rounded-full gap-2"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
          {loading ? "Starting checkout..." : "Upgrade to Premium — $9.99/mo"}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">Cancel anytime. No commitment.</p>
      </CardContent>
    </Card>
  );
}

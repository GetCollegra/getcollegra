import { motion } from "framer-motion";
import { Lock, Star, BarChart3, MapPin, StickyNote, Columns3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { trackClick } from "@/lib/analytics";
import { startCheckout } from "@/lib/checkout";
import { useToast } from "@/hooks/use-toast";

const sampleColleges = [
  { name: "University of Michigan", fit: 94, setting: "Urban", price: "$16,800", grad: "92%" },
  { name: "Georgia Tech", fit: 91, setting: "Urban", price: "$12,400", grad: "90%" },
  { name: "University of Virginia", fit: 88, setting: "Suburban", price: "$18,200", grad: "94%" },
];

const freeVsPremium = [
  { feature: "AI college matches", free: true, premium: true },
  { feature: "Top 3 match previews", free: true, premium: true },
  { feature: "Full match list with fit scores", free: false, premium: true },
  { feature: "Side-by-side comparison tool", free: false, premium: true },
  { feature: "College organizer & notes", free: false, premium: true },
  { feature: "Interactive campus map", free: false, premium: true },
  { feature: "Smart insights & analysis", free: false, premium: true },
];

const PremiumPreview = () => {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const { toast } = useToast();

  const handleUnlock = () => {
    trackClick("Unlock Premium Preview", "PremiumPreview");
    startCheckout(toast);
  };

  return (
    <section className="py-20 md:py-28 bg-secondary/30 border-b border-border overflow-hidden">
      <div className="container px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Premium Dashboard</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            See what you unlock
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your personalized dashboard gives you everything you need to find, compare, and choose the right colleges — all in one place.
          </p>
        </motion.div>

        {/* Free vs Premium comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-xl mx-auto mb-16"
        >
          <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="grid grid-cols-3 text-center border-b border-border">
              <div className="p-4" />
              <div className="p-4 border-x border-border">
                <p className="font-semibold text-muted-foreground text-sm">Free</p>
              </div>
              <div className="p-4 bg-primary/5">
                <p className="font-semibold text-primary text-sm">Premium ✦</p>
              </div>
            </div>
            {freeVsPremium.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 text-center ${i < freeVsPremium.length - 1 ? "border-b border-border" : ""}`}>
                <div className="p-3 px-4 text-left">
                  <p className="text-sm text-foreground">{row.feature}</p>
                </div>
                <div className="p-3 border-x border-border flex items-center justify-center">
                  {row.free ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-3 bg-primary/5 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-card rounded-2xl border border-border shadow-elevated overflow-hidden">
            {/* Mock tab bar */}
            <div className="flex items-center gap-1 border-b border-border px-4 pt-4 pb-0">
              {["My Matches", "Compare", "Map", "Notes"].map((tab, i) => (
                <div
                  key={tab}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg cursor-default ${
                    i === 0 ? "bg-background text-foreground border border-border border-b-0" : "text-muted-foreground"
                  }`}
                >
                  {tab}
                </div>
              ))}
            </div>

            {/* Dashboard content */}
            <div className="p-5 md:p-6">
              <div className="grid md:grid-cols-3 gap-4">
                {sampleColleges.map((college, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveCard(activeCard === i ? null : i)}
                    className="bg-background rounded-xl border border-border p-5 cursor-pointer transition-shadow hover:shadow-card relative"
                  >
                    {/* Fit score badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">{college.fit}% Fit</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        {college.setting}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-2 text-sm">{college.name}</h4>

                    {activeCard === i ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-2 mt-3 pt-3 border-t border-border"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Net Price</span>
                          <span className="font-medium text-foreground">{college.price}/yr</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Grad Rate</span>
                          <span className="font-medium text-foreground">{college.grad}</span>
                        </div>
                        {/* Blurred premium details */}
                        <div className="relative mt-2">
                          <div className="blur-[6px] pointer-events-none select-none space-y-2">
                            <div className="h-3 bg-muted rounded w-full" />
                            <div className="h-3 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-5/6" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center gap-1 text-xs font-medium text-primary">
                              <Lock className="w-3 h-3" />
                              <span>Premium</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Click to preview</p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Blurred bottom section — locked features */}
              <div className="relative mt-6 rounded-xl overflow-hidden">
                <div className="blur-md pointer-events-none select-none">
                  <div className="grid md:grid-cols-4 gap-4 p-4">
                    {[
                      { icon: Columns3, label: "Compare Tool" },
                      { icon: BarChart3, label: "Fit Insights" },
                      { icon: StickyNote, label: "College Notes" },
                      { icon: MapPin, label: "Campus Map" },
                    ].map((item, i) => (
                      <div key={i} className="bg-secondary rounded-lg p-5 h-28 flex flex-col items-center justify-center gap-2">
                        <item.icon className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[2px] rounded-xl">
                  <Lock className="w-8 h-8 text-primary mb-3" />
                  <p className="text-foreground font-semibold text-base md:text-lg mb-1 text-center px-4">
                    Unlock your full personalized dashboard with Premium
                  </p>
                  <p className="text-muted-foreground text-sm mb-4">Starting at $9.99/month</p>
                  <Button variant="hero" size="lg" onClick={handleUnlock}>
                    Unlock Premium
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumPreview;

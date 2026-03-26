import { motion, AnimatePresence } from "framer-motion";
import { Lock, Star, BarChart3, MapPin, StickyNote, Columns3, Check, X, Tag, CheckSquare, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { trackClick } from "@/lib/analytics";
import { startCheckout } from "@/lib/checkout";
import { useToast } from "@/hooks/use-toast";

const sampleColleges = [
  { name: "University of Michigan", fit: 94, setting: "Urban", price: "$16,800", grad: "92%", ratio: "15:1", salary: "$62,000" },
  { name: "Georgia Tech", fit: 91, setting: "Urban", price: "$12,400", grad: "90%", ratio: "18:1", salary: "$74,000" },
  { name: "University of Virginia", fit: 88, setting: "Suburban", price: "$18,200", grad: "94%", ratio: "14:1", salary: "$58,000" },
  { name: "Boston University", fit: 85, setting: "Urban", price: "$22,100", grad: "88%", ratio: "10:1", salary: "$56,000" },
  { name: "University of Wisconsin", fit: 82, setting: "Urban", price: "$11,200", grad: "87%", ratio: "17:1", salary: "$54,000" },
];

const compareMetrics = [
  { label: "Fit Score", values: ["94%", "91%", "88%"] },
  { label: "Acceptance Rate", values: ["23%", "17%", "21%"] },
  { label: "Annual Price", values: ["$56,212", "$60,348", "$58,100"] },
  { label: "Graduation Rate", values: ["92%", "90%", "94%"] },
  { label: "Student:Faculty", values: ["15:1", "18:1", "14:1"] },
];

const mapPins = [
  { name: "U of Michigan", top: "28%", left: "62%" },
  { name: "Georgia Tech", top: "62%", left: "60%" },
  { name: "U of Virginia", top: "48%", left: "68%" },
  { name: "Boston U", top: "25%", left: "78%" },
  { name: "U of Wisconsin", top: "25%", left: "50%" },
];

const notesColleges = [
  { name: "University of Michigan", tags: ["Favorite", "Affordable"], checklist: 3, total: 5, note: "Great engineering program" },
  { name: "Georgia Tech", tags: ["Top Choice"], checklist: 2, total: 5, note: "Strong CS reputation" },
  { name: "University of Virginia", tags: ["Likely"], checklist: 4, total: 5, note: "Beautiful campus" },
  { name: "Boston University", tags: ["Reach"], checklist: 1, total: 5, note: "Good location" },
  { name: "U of Wisconsin", tags: ["Affordable"], checklist: 0, total: 5, note: "Research opportunities" },
];

const freeVsPremium = [
  { feature: "AI college matches", free: true, premium: true },
  { feature: "Top 5 match previews", free: true, premium: true },
  { feature: "Full match list with fit scores", free: false, premium: true },
  { feature: "Side-by-side comparison tool", free: false, premium: true },
  { feature: "College organizer & notes", free: false, premium: true },
  { feature: "Interactive campus map", free: false, premium: true },
  { feature: "Smart insights & analysis", free: false, premium: true },
];

const tabs = ["My Matches", "Compare", "Map", "Notes"];

const PremiumPreview = () => {
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { toast } = useToast();

  const handleUnlock = () => {
    trackClick("Unlock Premium Preview", "PremiumPreview");
    startCheckout(toast);
  };

  const renderCollegeCard = (college: typeof sampleColleges[0], i: number) => (
    <motion.div
      key={i}
      whileHover={{ scale: 1.02 }}
      onClick={() => setActiveCard(activeCard === i ? null : i)}
      className="bg-background rounded-xl border border-border p-5 cursor-pointer transition-shadow hover:shadow-card relative"
    >
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
            <span className="text-muted-foreground">Annual Price</span>
            <span className="font-medium text-foreground">{college.price}/yr</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Grad Rate</span>
            <span className="font-medium text-foreground">{college.grad}</span>
          </div>
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
  );

  const renderMatchesTab = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {sampleColleges.map((college, i) => renderCollegeCard(college, i))}
    </div>
  );

  const renderCompareTab = () => (
    <div className="space-y-0">
      {/* Compare header */}
      <div className="grid grid-cols-4 gap-2 mb-1">
        <div />
        {sampleColleges.slice(0, 3).map((c, i) => (
          <div key={i} className="bg-background rounded-lg border border-border p-3 text-center">
            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
            <p className="text-xs text-primary font-medium">{c.fit}% Fit</p>
          </div>
        ))}
      </div>
      {/* Metrics rows */}
      {compareMetrics.map((metric, i) => (
        <div key={i} className={`grid grid-cols-4 gap-2 py-2.5 ${i < compareMetrics.length - 1 ? "border-b border-border" : ""}`}>
          <div className="flex items-center">
            <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
          </div>
          {metric.values.map((val, j) => (
            <div key={j} className="text-center">
              <span className="text-xs font-semibold text-foreground">{val}</span>
            </div>
          ))}
        </div>
      ))}
      {/* Blurred extra rows */}
      <div className="relative mt-2">
        <div className="blur-[6px] pointer-events-none select-none space-y-3 py-2">
          {[1, 2, 3].map(r => (
            <div key={r} className="grid grid-cols-4 gap-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
              <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
              <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            <Lock className="w-3 h-3" />
            <span>More metrics with Premium</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMapTab = () => (
    <div className="space-y-4">
      {/* Mock US map */}
      <div className="relative bg-secondary/50 rounded-xl border border-border overflow-hidden" style={{ height: 260 }}>
        {/* Simple US outline shape */}
        <div className="absolute inset-4 rounded-lg bg-background/50 border border-border/50" />
        {/* Pins */}
        {mapPins.map((pin, i) => (
          <div
            key={i}
            className="absolute flex flex-col items-center group"
            style={{ top: pin.top, left: pin.left }}
          >
            <div className="w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground shadow-card flex items-center justify-center">
              <MapPin className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-[10px] font-medium text-foreground bg-card px-1.5 py-0.5 rounded shadow-soft mt-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {pin.name}
            </span>
          </div>
        ))}
        <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
          5 colleges mapped
        </div>
      </div>
      {/* Blurred details below map */}
      <div className="relative">
        <div className="blur-[6px] pointer-events-none select-none grid grid-cols-2 gap-3">
          {[1, 2].map(r => (
            <div key={r} className="bg-background rounded-lg border border-border p-4 space-y-2">
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1 text-xs font-medium text-primary">
            <Lock className="w-3 h-3" />
            <span>Campus details with Premium</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotesTab = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {notesColleges.map((college, i) => (
        <div key={i} className="bg-background rounded-xl border border-border p-4 cursor-pointer hover:shadow-card transition-shadow">
          <h4 className="font-semibold text-foreground text-xs mb-2 truncate">{college.name}</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            {college.tags.map((tag, j) => (
              <span key={j} className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
            <CheckSquare className="w-3 h-3" />
            <span>{college.checklist}/{college.total} completed</span>
          </div>
          {/* Blurred note */}
          <div className="relative">
            <div className="blur-[4px] pointer-events-none select-none">
              <div className="flex items-start gap-1">
                <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5" />
                <p className="text-[10px] text-muted-foreground">{college.note}</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-0.5 text-[9px] font-medium text-primary">
                <Lock className="w-2.5 h-2.5" />
                <span>Premium</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const tabContent = [renderMatchesTab, renderCompareTab, renderMapTab, renderNotesTab];

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
            {/* Tab bar */}
            <div className="flex items-center gap-1 border-b border-border px-4 pt-4 pb-0">
              {tabs.map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(i); setActiveCard(null); }}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === i
                      ? "bg-background text-foreground border border-border border-b-0"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5 md:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  {tabContent[activeTab]()}
                </motion.div>
              </AnimatePresence>

              {/* Unlock CTA */}
              <div className="mt-6 rounded-xl bg-secondary/50 border border-border p-6 flex flex-col items-center text-center">
                <Lock className="w-7 h-7 text-primary mb-2" />
                <p className="text-foreground font-semibold text-base md:text-lg mb-1">
                  Unlock your full personalized dashboard with Premium
                </p>
                <p className="text-muted-foreground text-sm mb-4">Starting at $9.99/month</p>
                <Button variant="hero" size="lg" onClick={handleUnlock}>
                  Unlock Premium
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumPreview;

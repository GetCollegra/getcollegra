import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, X, Hospital, ShoppingCart, UtensilsCrossed, Dumbbell,
  Clock, MapPin, ChevronRight, Heart, ShoppingBag, Coffee, Pill
} from "lucide-react";
import type { College } from "@/types/college";

type NearbyPlace = {
  name: string;
  type: string;
  minutes: number;
  distance: string;
};

type NearbyCategory = {
  label: string;
  subtitle: string;
  places: NearbyPlace[];
};

type NearbySummary = {
  nearestHospital: { name: string; minutes: number };
  nearestGrocery: { name: string; minutes: number };
  restaurantsWithin10Min: number;
  closestShopping: { name: string; minutes: number };
};

type NearbyData = {
  summary: NearbySummary;
  categories: Record<string, NearbyCategory>;
};

const categoryIcons: Record<string, typeof Hospital> = {
  health: Hospital,
  essentials: ShoppingCart,
  food: UtensilsCrossed,
  lifestyle: Dumbbell,
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  health: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  essentials: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  food: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  lifestyle: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
};

const placeTypeIcons: Record<string, typeof Hospital> = {
  Hospital: Hospital,
  "Urgent Care": Heart,
  Pharmacy: Pill,
  Grocery: ShoppingCart,
  Restaurant: UtensilsCrossed,
  Cafe: Coffee,
  Gym: Dumbbell,
  Shopping: ShoppingBag,
  Entertainment: ShoppingBag,
};

type Props = {
  college: College;
  onClose: () => void;
};

export default function CampusNeighborhood({ college, onClose }: Props) {
  const [data, setData] = useState<NearbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("campus-nearby", {
          body: { collegeName: college.name, collegeLocation: college.location },
        });
        if (cancelled) return;
        if (fnError) throw new Error(fnError.message);
        if (result?.error) throw new Error(result.error);
        if (result?.nearby) setData(result.nearby);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [college.name, college.location]);

  // Scroll into view on mount
  useEffect(() => {
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <Card className="bg-card border-border shadow-soft mt-4">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate">{college.name}</h3>
                <p className="text-sm text-muted-foreground">Campus neighborhood &amp; nearby amenities</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Exploring the neighborhood...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          )}

          {data && (
            <div className="p-5 space-y-6">
              {/* Summary Insights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  icon={Hospital}
                  label="Nearest Hospital"
                  value={`${data.summary.nearestHospital.minutes} min`}
                  detail={data.summary.nearestHospital.name}
                  colorClass="text-rose-600 bg-rose-50"
                />
                <SummaryCard
                  icon={ShoppingCart}
                  label="Nearest Grocery"
                  value={`${data.summary.nearestGrocery.minutes} min`}
                  detail={data.summary.nearestGrocery.name}
                  colorClass="text-blue-600 bg-blue-50"
                />
                <SummaryCard
                  icon={UtensilsCrossed}
                  label="Restaurants < 10 min"
                  value={`${data.summary.restaurantsWithin10Min}+`}
                  detail="Within driving distance"
                  colorClass="text-amber-600 bg-amber-50"
                />
                <SummaryCard
                  icon={ShoppingBag}
                  label="Closest Shopping"
                  value={`${data.summary.closestShopping.minutes} min`}
                  detail={data.summary.closestShopping.name}
                  colorClass="text-violet-600 bg-violet-50"
                />
              </div>

              {/* Category Groups */}
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(data.categories).map(([key, category]) => {
                  const Icon = categoryIcons[key] || MapPin;
                  const colors = categoryColors[key] || categoryColors.health;
                  return (
                    <div key={key} className={`rounded-xl border ${colors.border} ${colors.bg}/30 p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-4 w-4 ${colors.text}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${colors.text}`}>{category.label}</p>
                          <p className="text-[10px] text-muted-foreground">{category.subtitle}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {category.places.map((place, i) => {
                          const PlaceIcon = placeTypeIcons[place.type] || MapPin;
                          return (
                            <div key={i} className="flex items-center gap-2.5 bg-card/80 rounded-lg px-3 py-2 border border-border/30">
                              <PlaceIcon className={`h-3.5 w-3.5 ${colors.text} shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                                <p className="text-[10px] text-muted-foreground">{place.type}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  {place.minutes} min
                                </div>
                                <p className="text-[10px] text-muted-foreground">{place.distance}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  colorClass,
}: {
  icon: typeof Hospital;
  label: string;
  value: string;
  detail: string;
  colorClass: string;
}) {
  const [bgClass, textClass] = colorClass.split(" ").length >= 2
    ? [colorClass.split(" ")[1], colorClass.split(" ")[0]]
    : ["bg-muted", "text-foreground"];

  return (
    <div className="bg-card rounded-xl border border-border/50 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${bgClass}`}>
          <Icon className={`h-3.5 w-3.5 ${textClass}`} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{detail}</p>
    </div>
  );
}

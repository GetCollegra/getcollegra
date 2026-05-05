import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, X, Hospital, ShoppingCart, UtensilsCrossed, Dumbbell,
  Clock, MapPin, Heart, ShoppingBag, Coffee, Pill, Plane, Bus, Footprints, Home,
} from "lucide-react";
import type { College } from "@/types/college";
import { geocodeLocation } from "@/components/CollegeMap";

type NearbyPlace = { name: string; type: string; minutes: number; distance: string };
type NearbyCategory = { label: string; subtitle: string; places: NearbyPlace[] };
type NearbySummary = {
  nearestHospital: { name: string; minutes: number };
  nearestGrocery: { name: string; minutes: number };
  restaurantsWithin10Min: number;
  closestShopping: { name: string; minutes: number };
  nearestAirport?: { name: string; minutes: number; code?: string };
  transitAccess?: { label: string; detail: string };
  walkScore?: number;
};
type NearbyData = { summary: NearbySummary; categories: Record<string, NearbyCategory> };

const categoryIcons: Record<string, typeof Hospital> = {
  health: Hospital,
  essentials: ShoppingCart,
  food: UtensilsCrossed,
  lifestyle: Dumbbell,
  transit: Bus,
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  health: { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  essentials: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  food: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  lifestyle: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
  transit: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
};

const placeTypeIcons: Record<string, typeof Hospital> = {
  Hospital, "Urgent Care": Heart, Pharmacy: Pill, Grocery: ShoppingCart,
  Restaurant: UtensilsCrossed, Cafe: Coffee, Gym: Dumbbell, Shopping: ShoppingBag,
  Entertainment: ShoppingBag, Airport: Plane, Transit: Bus,
};

type Props = { college: College; onClose: () => void; homeLocation?: string };

function haversine(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3959;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export default function CampusNeighborhood({ college, onClose, homeLocation }: Props) {
  const [data, setData] = useState<NearbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setData(null);
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

  useEffect(() => {
    setTimeout(() => containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  // Distance from home
  const distanceFromHome = (() => {
    if (!homeLocation) return null;
    const home = geocodeLocation(homeLocation);
    const camp = geocodeLocation(college.location);
    if (!home || !camp) return null;
    return Math.round(haversine(home, camp));
  })();

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
          <div className="flex items-center justify-between p-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0"><MapPin className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground truncate">Campus Area Explorer</h3>
                <p className="text-sm text-muted-foreground truncate">{college.name} · {college.location}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>

          {loading && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Exploring the neighborhood…</div>
            </div>
          )}

          {error && !loading && (
            <div className="p-8 text-center">
              <p className="text-sm text-destructive mb-2">Couldn't load neighborhood data right now.</p>
              <p className="text-xs text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          )}

          {data && (
            <div className="p-5 space-y-6">
              {/* Hero stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {distanceFromHome !== null && (
                  <SummaryCard icon={Home} label="From Home" value={`~${distanceFromHome.toLocaleString()} mi`} detail={homeLocation || ""} colorClass="text-primary bg-primary/10" />
                )}
                {typeof data.summary.walkScore === "number" && (
                  <SummaryCard icon={Footprints} label="Walkability" value={`${data.summary.walkScore}/100`} detail={data.summary.walkScore >= 70 ? "Very walkable" : data.summary.walkScore >= 50 ? "Somewhat walkable" : "Car helpful"} colorClass="text-emerald-600 bg-emerald-50" />
                )}
                <SummaryCard icon={UtensilsCrossed} label="Food < 10 min" value={`${data.summary.restaurantsWithin10Min}+`} detail="Restaurants & cafes" colorClass="text-amber-600 bg-amber-50" />
                <SummaryCard icon={ShoppingCart} label="Nearest Grocery" value={`${data.summary.nearestGrocery.minutes} min`} detail={data.summary.nearestGrocery.name} colorClass="text-blue-600 bg-blue-50" />
                <SummaryCard icon={Hospital} label="Nearest Hospital" value={`${data.summary.nearestHospital.minutes} min`} detail={data.summary.nearestHospital.name} colorClass="text-rose-600 bg-rose-50" />
                {data.summary.nearestAirport && (
                  <SummaryCard icon={Plane} label="Nearest Airport" value={`${data.summary.nearestAirport.minutes} min`} detail={data.summary.nearestAirport.code ? `${data.summary.nearestAirport.code} · ${data.summary.nearestAirport.name}` : data.summary.nearestAirport.name} colorClass="text-sky-600 bg-sky-50" />
                )}
                {data.summary.transitAccess && (
                  <SummaryCard icon={Bus} label="Public Transit" value={data.summary.transitAccess.label} detail={data.summary.transitAccess.detail} colorClass="text-violet-600 bg-violet-50" />
                )}
                <SummaryCard icon={ShoppingBag} label="Closest Shopping" value={`${data.summary.closestShopping.minutes} min`} detail={data.summary.closestShopping.name} colorClass="text-fuchsia-600 bg-fuchsia-50" />
              </div>

              {/* Categories */}
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(data.categories).map(([key, category]) => {
                  const Icon = categoryIcons[key] || MapPin;
                  const colors = categoryColors[key] || categoryColors.health;
                  return (
                    <div key={key} className={`rounded-xl border ${colors.border} ${colors.bg}/30 p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${colors.bg}`}><Icon className={`h-4 w-4 ${colors.text}`} /></div>
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
                                  <Clock className="h-3 w-3 text-muted-foreground" />{place.minutes} min
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
              <p className="text-[10px] text-muted-foreground text-center">Estimates from public sources & AI; verify before relying on specific times.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SummaryCard({ icon: Icon, label, value, detail, colorClass }: {
  icon: typeof Hospital; label: string; value: string; detail: string; colorClass: string;
}) {
  const parts = colorClass.split(" ");
  const textClass = parts[0] || "text-foreground";
  const bgClass = parts[1] || "bg-muted";
  return (
    <div className="bg-card rounded-xl border border-border/50 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${bgClass}`}><Icon className={`h-3.5 w-3.5 ${textClass}`} /></div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{detail}</p>
    </div>
  );
}

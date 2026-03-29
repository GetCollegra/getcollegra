import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Loader2, Sun, Cloud, Snowflake, Droplets, Thermometer, Wind,
  AlertTriangle, Shield, DollarSign, Home, Car, MapPin, TreePine,
  Coffee, ShoppingBag, Utensils, Heart, Eye, Camera, Building,
  Users, Zap, Waves, Flame, Mountain, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { College } from "@/types/college";

type SeasonData = {
  avgHigh: number;
  avgLow: number;
  description: string;
};

type DisasterRisk = {
  risk: "Low" | "Moderate" | "Higher";
  description: string;
};

type CampusHighlight = {
  title: string;
  description: string;
};

type CollegeLifeData = {
  weather: {
    climate: string;
    seasons: Record<string, SeasonData>;
    annualRainfall: string;
    annualSnowfall: string;
    sunnyDaysPerYear: number;
  };
  naturalDisasters: Record<string, DisasterRisk>;
  costOfLiving: {
    overallRating: string;
    comparedToNational: string;
    avgRent1Bedroom: string;
    avgRent2Bedroom: string;
    monthlyFood: string;
    transportation: string;
    affordabilityTips: string[];
  };
  areaLifestyle: {
    setting: string;
    walkability: string;
    needsCar: boolean;
    publicTransit: string;
    nearbyAttractions: string[];
    diningScene: string;
    nightlife: string;
    outdoorActivities: string[];
    generalVibe: string;
  };
  studentPerspective: string;
  campusPhotos: {
    searchTerms: string[];
    campusHighlights: CampusHighlight[];
  };
};

const seasonIcons: Record<string, typeof Sun> = {
  spring: Droplets,
  summer: Sun,
  fall: Wind,
  winter: Snowflake,
};

const seasonColors: Record<string, string> = {
  spring: "from-green-400 to-emerald-500",
  summer: "from-amber-400 to-orange-500",
  fall: "from-orange-400 to-red-500",
  winter: "from-blue-300 to-indigo-500",
};

const disasterIcons: Record<string, typeof AlertTriangle> = {
  tornadoes: Wind,
  hurricanes: Waves,
  earthquakes: Mountain,
  wildfires: Flame,
  flooding: Droplets,
  severeWinter: Snowflake,
};

const disasterLabels: Record<string, string> = {
  tornadoes: "Tornadoes",
  hurricanes: "Hurricanes",
  earthquakes: "Earthquakes",
  wildfires: "Wildfires",
  flooding: "Flooding",
  severeWinter: "Severe Winter",
};

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  Low: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Moderate: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Higher: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const highlightIcons = [Camera, Building, Home, Eye, MapPin];

type Props = {
  college: College;
};

type UnsplashPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  category: string;
};

export default function CollegeLifePanel({ college }: Props) {
  const [data, setData] = useState<CollegeLifeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("photos");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("college-life", {
          body: { collegeName: college.name, collegeLocation: college.location },
        });
        if (cancelled) return;
        if (fnError) throw new Error(fnError.message);
        if (result?.error) throw new Error(result.error);
        if (result?.collegeLife) setData(result.collegeLife);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [college.name, college.location]);

  // Fetch real campus photos from Unsplash
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setPhotosLoading(true);

    (async () => {
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke("campus-photos", {
          body: {
            collegeName: college.name,
            collegeLocation: college.location,
            searchTerms: data.campusPhotos?.searchTerms || [],
          },
        });
        if (cancelled) return;
        if (!fnError && result?.photos) {
          setPhotos(result.photos);
        }
      } catch (err) {
        console.error("Failed to load campus photos:", err);
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [college.name, data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Exploring what life is like at {college.name}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Student Perspective Hero */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/10 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">What Living Here Might Feel Like</h3>
              <p className="text-xs text-muted-foreground">A student's perspective on life at {college.name}</p>
            </div>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed italic pl-12">
            "{data.studentPerspective}"
          </p>
        </CardContent>
      </Card>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-5 h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
          <TabsTrigger value="photos" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-soft">
            <Camera className="h-3.5 w-3.5" /> Campus
          </TabsTrigger>
          <TabsTrigger value="weather" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-soft">
            <Sun className="h-3.5 w-3.5" /> Weather
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-soft">
            <Shield className="h-3.5 w-3.5" /> Safety
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-soft">
            <DollarSign className="h-3.5 w-3.5" /> Living Cost
          </TabsTrigger>
          <TabsTrigger value="area" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-soft">
            <MapPin className="h-3.5 w-3.5" /> Area
          </TabsTrigger>
        </TabsList>

        {/* Campus Photos & Experience */}
        <TabsContent value="photos" className="mt-4">
          <div className="space-y-4">
            {/* Real campus photos from Unsplash */}
            {photosLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading real campus photos...</p>
              </div>
            ) : photos.length > 0 ? (
              <>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {photos.map((photo, i) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="cursor-pointer group"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <div className="aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted relative">
                        <img
                          src={photo.thumbUrl}
                          alt={photo.alt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="text-[9px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                            {photo.category}
                          </span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] text-white truncate">📷 {photo.photographer}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <p className="text-[10px] text-center text-muted-foreground">
                  Photos from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Unsplash</a> — real campus and area photography
                </p>
              </>
            ) : (
              /* Fallback: campus highlights cards */
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.campusPhotos.campusHighlights.map((highlight, i) => {
                  const Icon = highlightIcons[i % highlightIcons.length];
                  const gradient = seasonColors[Object.keys(seasonColors)[i % 4]];
                  return (
                    <Card key={i} className="h-full bg-card border-border overflow-hidden">
                      <div className={`h-28 bg-gradient-to-br ${gradient} relative`}>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Icon className="h-10 w-10 text-white/70" />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-foreground text-sm mb-1">{highlight.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{highlight.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Search suggestion */}
            {data.campusPhotos.searchTerms.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <p className="text-xs text-muted-foreground">Search for more photos:</p>
                {data.campusPhotos.searchTerms.map((term, i) => (
                  <a
                    key={i}
                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(term)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10 transition-colors">
                      <Camera className="h-3 w-3 mr-1" />{term}
                    </Badge>
                  </a>
                ))}
              </div>
            )}

            {/* Lightbox dialog for selected photo */}
            <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
              <DialogContent className="max-w-3xl p-2 bg-background">
                {selectedPhoto && (
                  <div className="space-y-2">
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.alt}
                      className="w-full rounded-lg object-contain max-h-[70vh]"
                    />
                    <div className="flex items-center justify-between px-2 pb-2">
                      <p className="text-xs text-muted-foreground">{selectedPhoto.alt}</p>
                      <a
                        href={`${selectedPhoto.photographerUrl}?utm_source=collegra&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        📷 {selectedPhoto.photographer} on Unsplash
                      </a>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        {/* Weather & Climate */}
        <TabsContent value="weather" className="mt-4">
          <div className="space-y-4">
            {/* Climate Hero */}
            <Card className="bg-gradient-to-br from-sky-500/10 via-card to-amber-500/10 border-primary/10 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 shrink-0">
                    <Thermometer className="h-5 w-5 text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-base mb-1">Climate Overview</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{data.weather.climate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Droplets, label: "Annual Rainfall", value: data.weather.annualRainfall, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { icon: Snowflake, label: "Annual Snowfall", value: data.weather.annualSnowfall, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                    { icon: Sun, label: "Sunny Days/Year", value: String(data.weather.sunnyDaysPerYear), color: "text-amber-500", bg: "bg-amber-500/10" },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-background/60 rounded-xl p-3 border border-border/50 text-center">
                        <div className={`inline-flex p-1.5 rounded-lg ${stat.bg} mb-2`}>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <p className="text-sm font-bold text-foreground">{stat.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Season Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.weather.seasons).map(([season, info]) => {
                const Icon = seasonIcons[season] || Sun;
                const gradient = seasonColors[season] || seasonColors.spring;
                const tempRange = info.avgHigh - info.avgLow;
                const tempPercent = Math.min(100, Math.round((info.avgHigh / 110) * 100));
                return (
                  <motion.div
                    key={season}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Object.keys(data.weather.seasons).indexOf(season) * 0.1 }}
                  >
                    <Card className="bg-card border-border overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-foreground capitalize">{season}</span>
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-20`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="flex items-end gap-1 mb-2">
                          <span className="text-3xl font-extrabold text-foreground leading-none">{info.avgHigh}°</span>
                          <span className="text-sm text-muted-foreground mb-0.5">/ {info.avgLow}°F</span>
                        </div>
                        {/* Temp bar */}
                        <div className="w-full h-1.5 rounded-full bg-muted mb-2">
                          <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${tempPercent}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{tempRange}° range</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Natural Disaster Risks — Enhanced */}
        <TabsContent value="risks" className="mt-4">
          <div className="space-y-4">
            {/* Safety Summary */}
            <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-amber-500/10 border-primary/10">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                    <Shield className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base mb-1">Environmental Safety Profile</h3>
                    <p className="text-sm text-muted-foreground">Regional risk factors near {college.location}. Understanding local risks helps you prepare and stay safe.</p>
                  </div>
                </div>
                {/* Risk overview bar */}
                <div className="flex gap-2">
                  {(() => {
                    const counts = { Low: 0, Moderate: 0, Higher: 0 };
                    Object.values(data.naturalDisasters).forEach((r) => { counts[r.risk] = (counts[r.risk] || 0) + 1; });
                    return (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="w-3 h-3 rounded-full bg-emerald-400" />{counts.Low} Low</div>
                        <div className="flex items-center gap-1.5 text-xs text-amber-600"><span className="w-3 h-3 rounded-full bg-amber-400" />{counts.Moderate} Moderate</div>
                        <div className="flex items-center gap-1.5 text-xs text-rose-600"><span className="w-3 h-3 rounded-full bg-rose-400" />{counts.Higher} Higher</div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.naturalDisasters).map(([key, risk]) => {
                const Icon = disasterIcons[key] || AlertTriangle;
                const label = disasterLabels[key] || key;
                const colors = riskColors[risk.risk] || riskColors.Low;
                const riskLevel = risk.risk === "Low" ? 25 : risk.risk === "Moderate" ? 60 : 90;
                const barColor = risk.risk === "Low" ? "bg-emerald-400" : risk.risk === "Moderate" ? "bg-amber-400" : "bg-rose-400";
                return (
                  <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Object.keys(data.naturalDisasters).indexOf(key) * 0.06 }}>
                    <Card className={`border ${colors.border} ${colors.bg}/30 hover:shadow-md transition-shadow h-full`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                              <Icon className={`h-4 w-4 ${colors.text}`} />
                            </div>
                            <span className="text-sm font-bold text-foreground">{label}</span>
                          </div>
                          <Badge className={`${colors.bg} ${colors.text} border ${colors.border} text-[10px] font-bold`}>
                            {risk.risk}
                          </Badge>
                        </div>
                        {/* Risk level bar */}
                        <div className="w-full h-1.5 rounded-full bg-muted mb-2">
                          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${riskLevel}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Cost of Living — Enhanced */}
        <TabsContent value="cost" className="mt-4">
          <div className="space-y-4">
            {/* Cost Hero */}
            <Card className="bg-gradient-to-br from-green-500/10 via-card to-emerald-500/5 border-primary/10 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-green-500/10 shrink-0">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-base">Cost of Living</h3>
                      <Badge className={`text-xs font-bold ${
                        data.costOfLiving.overallRating === "Low" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        data.costOfLiving.overallRating === "Moderate" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-rose-100 text-rose-700 border-rose-200"
                      }`}>
                        {data.costOfLiving.overallRating}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold text-foreground">{data.costOfLiving.comparedToNational}</span> compared to national average
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "1-Bedroom Rent", value: data.costOfLiving.avgRent1Bedroom, icon: Home, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "2-Bedroom Rent", value: data.costOfLiving.avgRent2Bedroom, icon: Building, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                    { label: "Monthly Food", value: data.costOfLiving.monthlyFood, icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { label: "Transportation", value: data.costOfLiving.transportation, icon: Car, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <motion.div key={item.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <div className="bg-background/60 rounded-xl p-4 border border-border/50 text-center hover:shadow-sm transition-shadow">
                          <div className={`inline-flex p-2 rounded-lg ${item.bg} mb-2`}>
                            <Icon className={`h-4 w-4 ${item.color}`} />
                          </div>
                          <p className="text-base font-extrabold text-foreground">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Affordability Tips */}
            {data.costOfLiving.affordabilityTips?.length > 0 && (
              <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Money-Saving Tips for Students</span>
                  </div>
                  <div className="space-y-2.5">
                    {data.costOfLiving.affordabilityTips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-3 bg-background/50 rounded-lg p-3 border border-border/30">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Area & Lifestyle — Enhanced */}
        <TabsContent value="area" className="mt-4">
          <div className="space-y-4">
            {/* General Vibe Hero */}
            <Card className="bg-gradient-to-br from-violet-500/10 via-card to-pink-500/10 border-primary/10 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 shrink-0">
                    <Heart className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">The Vibe</p>
                    <p className="text-sm text-foreground leading-relaxed">{data.areaLifestyle.generalVibe}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setting & Transport */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Setting & Walkability</span>
                  </div>
                  <Badge className="mb-3 text-xs font-bold bg-primary/10 text-primary border-primary/20">{data.areaLifestyle.setting}</Badge>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{data.areaLifestyle.walkability}</p>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${data.areaLifestyle.needsCar ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                    <Car className="h-4 w-4" />
                    {data.areaLifestyle.needsCar ? "Car recommended for this area" : "Car not essential — walkable/bikeable"}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Public Transit</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.areaLifestyle.publicTransit}</p>
                </CardContent>
              </Card>
            </div>

            {/* Nearby Attractions & Outdoor */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-pink-500/10">
                      <ShoppingBag className="h-4 w-4 text-pink-500" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Nearby Attractions</span>
                  </div>
                  <div className="space-y-2">
                    {data.areaLifestyle.nearbyAttractions.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 bg-muted/30 rounded-lg p-2.5 border border-border/30">
                        <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="text-xs text-foreground leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <TreePine className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Outdoor Activities</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.areaLifestyle.outdoorActivities.map((activity, i) => (
                      <Badge key={i} className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors">
                        <TreePine className="h-3 w-3 mr-1" />{activity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dining & Nightlife */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                      <Coffee className="h-4 w-4 text-orange-500" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Dining Scene</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.areaLifestyle.diningScene}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                      <Users className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-sm font-bold text-foreground">Nightlife & Social</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{data.areaLifestyle.nightlife}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

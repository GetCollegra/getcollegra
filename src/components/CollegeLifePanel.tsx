import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Sun, Cloud, Snowflake, Droplets, Thermometer, Wind,
  AlertTriangle, Shield, DollarSign, Home, Car, MapPin, TreePine,
  Coffee, ShoppingBag, Utensils, Heart, Eye, Camera, Building,
  Users, Zap, Waves, Flame, Mountain
} from "lucide-react";
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

export default function CollegeLifePanel({ college }: Props) {
  const [data, setData] = useState<CollegeLifeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("photos");

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
            <DollarSign className="h-3.5 w-3.5" /> Cost
          </TabsTrigger>
          <TabsTrigger value="area" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-soft">
            <MapPin className="h-3.5 w-3.5" /> Area
          </TabsTrigger>
        </TabsList>

        {/* Campus Photos & Experience */}
        <TabsContent value="photos" className="mt-4">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.campusPhotos.campusHighlights.map((highlight, i) => {
                const Icon = highlightIcons[i % highlightIcons.length];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Card className="h-full bg-card border-border hover:shadow-card transition-shadow overflow-hidden group">
                      {/* Gradient placeholder for campus area */}
                      <div className={`h-32 bg-gradient-to-br ${seasonColors[Object.keys(seasonColors)[i % 4]]} opacity-20 relative`}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className="h-10 w-10 text-foreground/30" />
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-foreground text-sm mb-1">{highlight.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{highlight.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center italic">
              Search "{data.campusPhotos.searchTerms[0]}" for real campus photos
            </p>
          </div>
        </TabsContent>

        {/* Weather & Climate */}
        <TabsContent value="weather" className="mt-4">
          <div className="space-y-4">
            {/* Climate Summary */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground text-sm">Climate Overview</span>
                </div>
                <p className="text-sm text-muted-foreground">{data.weather.climate}</p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {data.weather.annualRainfall} rain</span>
                  <span className="flex items-center gap-1"><Snowflake className="h-3 w-3" /> {data.weather.annualSnowfall} snow</span>
                  <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> {data.weather.sunnyDaysPerYear} sunny days/yr</span>
                </div>
              </CardContent>
            </Card>

            {/* Season Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.weather.seasons).map(([season, info]) => {
                const Icon = seasonIcons[season] || Sun;
                const gradient = seasonColors[season] || seasonColors.spring;
                return (
                  <motion.div
                    key={season}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Object.keys(data.weather.seasons).indexOf(season) * 0.1 }}
                  >
                    <Card className="bg-card border-border overflow-hidden">
                      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-foreground capitalize">{season}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-2xl font-bold text-foreground">{info.avgHigh}°</span>
                          <span className="text-sm text-muted-foreground">/ {info.avgLow}°F</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Natural Disaster Risks */}
        <TabsContent value="risks" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Regional environmental risk factors for {college.location}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.naturalDisasters).map(([key, risk]) => {
                const Icon = disasterIcons[key] || AlertTriangle;
                const label = disasterLabels[key] || key;
                const colors = riskColors[risk.risk] || riskColors.Low;
                return (
                  <Card key={key} className={`border ${colors.border} ${colors.bg}/30`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${colors.text}`} />
                          <span className="text-sm font-semibold text-foreground">{label}</span>
                        </div>
                        <Badge className={`${colors.bg} ${colors.text} border ${colors.border} text-xs`}>
                          {risk.risk}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{risk.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Cost of Living */}
        <TabsContent value="cost" className="mt-4">
          <div className="space-y-4">
            {/* Overall Rating */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Cost of Living</span>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {data.costOfLiving.overallRating}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{data.costOfLiving.comparedToNational} compared to national average</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "1BR Rent", value: data.costOfLiving.avgRent1Bedroom, icon: Home },
                    { label: "2BR Rent", value: data.costOfLiving.avgRent2Bedroom, icon: Building },
                    { label: "Monthly Food", value: data.costOfLiving.monthlyFood, icon: Utensils },
                    { label: "Transportation", value: data.costOfLiving.transportation, icon: Car },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Icon className="h-3 w-3" />{item.label}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Affordability Tips */}
            {data.costOfLiving.affordabilityTips?.length > 0 && (
              <Card className="bg-secondary/30 border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Money-Saving Tips
                  </p>
                  <ul className="space-y-1.5">
                    {data.costOfLiving.affordabilityTips.map((tip, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Area & Lifestyle */}
        <TabsContent value="area" className="mt-4">
          <div className="space-y-4">
            {/* Setting & Transport */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Setting</span>
                  </div>
                  <Badge variant="secondary" className="mb-2 text-xs">{data.areaLifestyle.setting}</Badge>
                  <p className="text-xs text-muted-foreground">{data.areaLifestyle.walkability}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <Car className={`h-3.5 w-3.5 ${data.areaLifestyle.needsCar ? "text-amber-600" : "text-emerald-600"}`} />
                    <span className="text-foreground font-medium">
                      {data.areaLifestyle.needsCar ? "Car recommended" : "Car not essential"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Transportation</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.areaLifestyle.publicTransit}</p>
                </CardContent>
              </Card>
            </div>

            {/* General Vibe */}
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">General Vibe</p>
                <p className="text-sm text-foreground">{data.areaLifestyle.generalVibe}</p>
              </CardContent>
            </Card>

            {/* Nearby & Activities */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Nearby Attractions
                  </p>
                  <ul className="space-y-1.5">
                    {data.areaLifestyle.nearbyAttractions.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <TreePine className="h-3.5 w-3.5 text-primary" /> Outdoor Activities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.areaLifestyle.outdoorActivities.map((activity, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{activity}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dining & Nightlife */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Dining</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.areaLifestyle.diningScene}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Nightlife & Social</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{data.areaLifestyle.nightlife}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

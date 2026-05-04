import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Target, DollarSign, GraduationCap, Users, MapPin, BookOpen,
  Bookmark, StickyNote, Map as MapIcon, X, Plus, Trophy, TrendingUp, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import type { College } from "@/types/college";
import { useCollegePhoto } from "@/hooks/useCollegePhoto";
import { getFallbackForCollege, createUniqueFallbackIndexes, getCollegeFallbackKey } from "@/lib/campusFallback";

type SavedCollege = {
  id: string;
  college_name: string;
  college_data: College;
  status: string;
  notes: string;
};

type ComparisonRow = {
  label: string;
  key: string;
  icon: typeof Target;
  getValue: (c: College) => string | number;
  getNumeric: (c: College) => number;
  format?: "percent" | "currency" | "ratio" | "number" | "text";
  higherIsBetter?: boolean;
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Fit Score",
    key: "fitScore",
    icon: Trophy,
    getValue: c => `${c.fitScore}%`,
    getNumeric: c => c.fitScore,
    format: "percent",
    higherIsBetter: true,
  },
  {
    label: "Acceptance Rate",
    key: "acceptanceRate",
    icon: Target,
    getValue: c => c.acceptanceRate,
    getNumeric: c => parseFloat(c.acceptanceRate.replace(/[^0-9.]/g, "")) || 0,
    format: "percent",
    higherIsBetter: true, // higher acceptance = easier to get in
  },
  {
    label: "Annual Price",
    key: "tuitionOutOfState",
    icon: DollarSign,
    getValue: c => c.tuitionOutOfState,
    getNumeric: c => parseInt(c.tuitionOutOfState.replace(/[^0-9]/g, "")) || 0,
    format: "currency",
    higherIsBetter: false,
  },
  {
    label: "Graduation Rate",
    key: "graduationRate",
    icon: GraduationCap,
    getValue: c => c.graduationRate,
    getNumeric: c => parseFloat(c.graduationRate.replace(/[^0-9.]/g, "")) || 0,
    format: "percent",
    higherIsBetter: true,
  },
  {
    label: "Student:Faculty Ratio",
    key: "studentFacultyRatio",
    icon: Users,
    getValue: c => c.studentFacultyRatio,
    getNumeric: c => parseFloat(c.studentFacultyRatio.replace(/[^0-9.]/g, "")) || 0,
    format: "ratio",
    higherIsBetter: false, // lower ratio = more attention
  },
  {
    label: "Starting Salary",
    key: "avgStartingSalary",
    icon: TrendingUp,
    getValue: c => c.avgStartingSalary,
    getNumeric: c => parseInt(c.avgStartingSalary.replace(/[^0-9]/g, "")) || 0,
    format: "currency",
    higherIsBetter: true,
  },
  {
    label: "Campus Setting",
    key: "setting",
    icon: Building2,
    getValue: c => c.setting,
    getNumeric: () => 0,
    format: "text",
  },
  {
    label: "Campus Vibe",
    key: "campusVibe",
    icon: MapPin,
    getValue: c => c.campusVibe,
    getNumeric: () => 0,
    format: "text",
  },
];

/** Compact photo+gradient banner used at the top of each compare column card. */
function CompareBanner({ collegeName, collegeLocation, index, fallbackIndex, isCompact }: { collegeName: string; collegeLocation?: string; index: number; fallbackIndex?: number; isCompact: boolean }) {
  const { url } = useCollegePhoto(collegeName, fallbackIndex ?? index, collegeLocation);
  const [imgFailed, setImgFailed] = useState(false);
  const fallbackSrc = getFallbackForCollege(collegeName, fallbackIndex, collegeLocation);
  const resolvedSrc = !imgFailed ? (url || fallbackSrc) : fallbackSrc;
  const bannerClass = `bg-banner-${(index % 6) + 1}`;
  return (
    <div className={`relative overflow-hidden ${isCompact ? "h-12" : "h-16"}`}>
      <div className={`absolute inset-0 ${bannerClass}`} aria-hidden />
      <img
        src={resolvedSrc}
        alt={`${collegeName} campus`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setImgFailed(true)}
      />
      <div className="absolute inset-0 banner-pattern" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/40" aria-hidden />
    </div>
  );
}

type Props = {
  savedColleges: SavedCollege[];
  comparedColleges: SavedCollege[];
  compareIds: Set<string>;
  onToggleCompare: (id: string) => void;
  onOpenNotes: (id: string) => void;
  onSwitchToMap: () => void;
  matchedColleges?: College[];
};

export default function CollegeComparison({
  savedColleges,
  comparedColleges,
  compareIds,
  onToggleCompare,
  onOpenNotes,
  onSwitchToMap,
  matchedColleges = [],
}: Props) {
  // Build unmasked compare data from matched colleges using robust name matching
  const unmaskedCompared = useMemo(() => {
    const normalizeCollegeName = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, "");

    const lookup = new Map<string, College>();
    matchedColleges.forEach((c) => {
      lookup.set(c.name, c);
      lookup.set(normalizeCollegeName(c.name), c);
    });

    const findUnmaskedCollege = (saved: SavedCollege): College | undefined => {
      const exact = lookup.get(saved.college_name);
      if (exact) return exact;

      const normalized = lookup.get(normalizeCollegeName(saved.college_name));
      if (normalized) return normalized;

      const savedNorm = normalizeCollegeName(saved.college_name);
      return matchedColleges.find((c) => {
        const nameNorm = normalizeCollegeName(c.name);
        return nameNorm.includes(savedNorm) || savedNorm.includes(nameNorm);
      });
    };

    return comparedColleges.map((saved) => {
      const unmasked = findUnmaskedCollege(saved);
      if (!unmasked) return saved;

      const merged = { ...saved.college_data };
      for (const key of Object.keys(merged) as (keyof College)[]) {
        if (
          (merged as any)[key] === "Premium" &&
          (unmasked as any)[key] !== undefined &&
          (unmasked as any)[key] !== "Premium"
        ) {
          (merged as any)[key] = (unmasked as any)[key];
        }
      }
      return { ...saved, college_data: merged as College };
    });
  }, [comparedColleges, matchedColleges]);
  // Find best values for highlighting
  const bestValues = useMemo(() => {
    const bests: Record<string, string> = {};
    COMPARISON_ROWS.forEach(row => {
      if (row.format === "text" || unmaskedCompared.length < 2) return;
      let bestId = "";
      let bestVal = row.higherIsBetter ? -Infinity : Infinity;
      unmaskedCompared.forEach(c => {
        const val = row.getNumeric(c.college_data);
        if (val === 0 || isNaN(val)) return;
        if (row.higherIsBetter ? val > bestVal : val < bestVal) {
          bestVal = val;
          bestId = c.id;
        }
      });
      if (bestId) bests[row.key] = bestId;
    });
    return bests;
  }, [unmaskedCompared]);
  const fallbackIndexes = useMemo(
    () => createUniqueFallbackIndexes([...savedColleges.map(s => s.college_name), ...matchedColleges.map(c => c.name)]),
    [savedColleges, matchedColleges],
  );

  // Progress bar ranges
  const ranges = useMemo(() => {
    const r: Record<string, { min: number; max: number }> = {};
    COMPARISON_ROWS.forEach(row => {
      if (row.format === "text") return;
      const vals = unmaskedCompared.map(c => row.getNumeric(c.college_data)).filter(v => v > 0);
      if (vals.length === 0) return;
      r[row.key] = { min: Math.min(...vals) * 0.5, max: Math.max(...vals) * 1.2 };
    });
    return r;
  }, [unmaskedCompared]);

  const getProgressPercent = (row: ComparisonRow, college: College): number => {
    const range = ranges[row.key];
    if (!range || range.max === range.min) return 50;
    const val = row.getNumeric(college);
    if (val === 0) return 0;
    return Math.max(5, Math.min(100, ((val - range.min) / (range.max - range.min)) * 100));
  };

  if (savedColleges.length < 2) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-10 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Save at least 2 colleges</h3>
          <p className="text-muted-foreground">Add colleges to your saved list to compare them side by side.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* College Selector */}
      <div className="flex flex-wrap gap-2">
        {savedColleges.map(s => {
          const selected = compareIds.has(s.id);
          return (
            <Button
              key={s.id}
              variant={selected ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleCompare(s.id)}
              className={`gap-1.5 transition-all ${selected ? "shadow-soft" : ""}`}
            >
              {selected ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {s.college_name}
            </Button>
          );
        })}
      </div>

      {unmaskedCompared.length < 2 && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Select at least 2 colleges above to start comparing.</p>
          </CardContent>
        </Card>
      )}

      {unmaskedCompared.length >= 2 && (
        <div className="space-y-0">
          {/* Column headers — college cards */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `140px repeat(${unmaskedCompared.length}, minmax(0, 1fr))` }}>
            {/* Empty top-left cell */}
            <div />

            {unmaskedCompared.map((c, i) => {
              const college = c.college_data;
              const catColors: Record<string, string> = {
                Reach: "text-orange-600 bg-orange-50",
                Match: "text-primary bg-primary/5",
                Safety: "text-emerald-600 bg-emerald-50",
              };
              const catColor = catColors[college.fitCategory] || catColors.Match;
              const isCompact = unmaskedCompared.length >= 4;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="card-premium overflow-hidden h-full border-border/60 bg-card/80 backdrop-blur-sm">
                    <CompareBanner
                      collegeName={c.college_name}
                      index={i}
                      fallbackIndex={fallbackIndexes.get(getCollegeFallbackKey(c.college_name))}
                      isCompact={isCompact}
                    />
                    <div className="h-1 bg-primary/20 w-full">
                      <div className="h-full bg-primary rounded-r-full" style={{ width: `${college.fitScore}%` }} />
                    </div>
                    <CardContent className={isCompact ? "p-2.5" : "p-4"}>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <h3 className={`font-bold text-foreground leading-tight ${isCompact ? "text-xs" : "text-sm"}`} title={c.college_name}>
                            {isCompact && c.college_name.length > 20
                              ? c.college_name.substring(0, 18) + "…"
                              : c.college_name}
                          </h3>
                          <div className={`flex items-center gap-1 text-muted-foreground mt-0.5 ${isCompact ? "text-[10px]" : "text-xs"}`}>
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{college.location}</span>
                          </div>
                        </div>
                        <Badge className={`${catColor} border-0 text-[10px] px-1.5 py-0 shrink-0`}>
                          {college.fitCategory}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        <span className={`font-bold text-primary ${isCompact ? "text-lg" : "text-2xl"}`}>{college.fitScore}</span>
                        <span className="text-[10px] text-muted-foreground">% fit</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary gap-0.5"
                          onClick={() => onOpenNotes(c.id)}
                        >
                          <StickyNote className="h-2.5 w-2.5" /> Notes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary gap-0.5"
                          onClick={onSwitchToMap}
                        >
                          <MapIcon className="h-2.5 w-2.5" /> Map
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive"
                          onClick={() => onToggleCompare(c.id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Comparison rows */}
          <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
            {COMPARISON_ROWS.map((row, rowIdx) => {
              const Icon = row.icon;
              const isBest = (id: string) => bestValues[row.key] === id;

              return (
                <div
                  key={row.key}
                  className={`grid items-center gap-2 px-3 py-3 ${
                    rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20"
                  } ${rowIdx < COMPARISON_ROWS.length - 1 ? "border-b border-border/50" : ""}`}
                  style={{ gridTemplateColumns: `140px repeat(${unmaskedCompared.length}, minmax(0, 1fr))` }}
                >
                  {/* Row label */}
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{row.label}</span>
                  </div>

                  {/* Values */}
                  {unmaskedCompared.map(c => {
                    const rawValue = row.getValue(c.college_data);
                    const NA_VALUES = new Set(["Premium", "N/A", "See school website", "Not reported", "—", ""]);
                    const isUnavailable = typeof rawValue === "string" && NA_VALUES.has(rawValue);
                    const value = isUnavailable ? "—" : rawValue;
                    const best = isBest(c.id);
                    const showBar = row.format !== "text" && !isUnavailable;

                    return (
                      <div key={c.id} className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold truncate ${
                            isUnavailable ? "text-muted-foreground/50" : best ? "text-primary" : "text-foreground"
                          }`}>
                            {value}
                          </span>
                          {best && !isUnavailable && (
                            <Badge className="bg-primary/10 text-primary border-0 text-[9px] px-1.5 py-0 shrink-0">
                              Best
                            </Badge>
                          )}
                        </div>
                        {showBar && (
                          <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${getProgressPercent(row, c.college_data)}%` }}
                              transition={{ duration: 0.6, delay: rowIdx * 0.05 }}
                              className={`h-full rounded-full ${best ? "bg-primary" : "bg-muted-foreground/30"}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Top Programs comparison */}
          <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
            <div
              className="grid items-start gap-2 px-3 py-4"
              style={{ gridTemplateColumns: `140px repeat(${unmaskedCompared.length}, minmax(0, 1fr))` }}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">Top Programs</span>
              </div>
              {unmaskedCompared.map(c => (
                <div key={c.id} className="flex flex-wrap gap-1">
                  {c.college_data.topPrograms.slice(0, 4).map((prog, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5">
                      {prog}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

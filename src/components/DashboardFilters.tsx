import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Filter, SlidersHorizontal, ArrowUpDown, X, ChevronDown, ChevronUp,
  MapPin, Users, DollarSign, Target, BookOpen,
} from "lucide-react";
import type { College } from "@/types/college";

export type FilterState = {
  region: string;
  size: string;
  maxTuition: number;
  minAcceptanceRate: number;
  major: string;
};

export type SortOption =
  | "fitScore"
  | "lowestCost"
  | "highestAcceptance"
  | "mostSelective";

const DEFAULT_FILTERS: FilterState = {
  region: "all",
  size: "all",
  maxTuition: 80000,
  minAcceptanceRate: 0,
  major: "all",
};

const REGIONS: Record<string, string[]> = {
  Northeast: ["CT", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT", "DE", "MD", "DC"],
  Southeast: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"],
  Midwest: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
  Southwest: ["AZ", "NM", "OK", "TX"],
  West: ["AK", "CA", "CO", "HI", "ID", "MT", "NV", "OR", "UT", "WA", "WY"],
};

function getRegion(location: string): string {
  const state = location.split(",").pop()?.trim().toUpperCase() || "";
  for (const [region, states] of Object.entries(REGIONS)) {
    if (states.includes(state)) return region;
  }
  return "Other";
}

function parseNumber(s: string): number {
  return parseInt(s?.replace(/[^0-9]/g, "") || "0") || 0;
}

function getSchoolSize(college: College): string {
  const size = parseNumber(college.studentBody);
  if (size === 0) return "unknown";
  if (size < 5000) return "small";
  if (size < 15000) return "medium";
  return "large";
}

export function extractMajors(colleges: College[]): string[] {
  const majors = new Set<string>();
  colleges.forEach(c => c.topPrograms?.forEach(p => majors.add(p)));
  return Array.from(majors).sort();
}

export function applyFilters(colleges: College[], filters: FilterState): College[] {
  return colleges.filter(c => {
    if (filters.region !== "all" && getRegion(c.location) !== filters.region) return false;
    if (filters.size !== "all" && getSchoolSize(c) !== filters.size) return false;
    const tuition = parseNumber(c.tuitionOutOfState);
    if (tuition > 0 && tuition > filters.maxTuition) return false;
    const acceptance = parseFloat(c.acceptanceRate?.replace(/[^0-9.]/g, "") || "0");
    if (acceptance > 0 && acceptance < filters.minAcceptanceRate) return false;
    if (filters.major !== "all" && !c.topPrograms?.some(p => p.toLowerCase().includes(filters.major.toLowerCase()))) return false;
    return true;
  });
}

export function applySorting(colleges: College[], sort: SortOption): College[] {
  const sorted = [...colleges];
  switch (sort) {
    case "fitScore":
      return sorted.sort((a, b) => b.fitScore - a.fitScore);
    case "lowestCost":
      return sorted.sort((a, b) => parseNumber(a.tuitionOutOfState) - parseNumber(b.tuitionOutOfState));
    case "highestAcceptance":
      return sorted.sort((a, b) => {
        const rateA = parseFloat(a.acceptanceRate?.replace(/[^0-9.]/g, "") || "0");
        const rateB = parseFloat(b.acceptanceRate?.replace(/[^0-9.]/g, "") || "0");
        return rateB - rateA;
      });
    case "mostSelective":
      return sorted.sort((a, b) => {
        const rateA = parseFloat(a.acceptanceRate?.replace(/[^0-9.]/g, "") || "100");
        const rateB = parseFloat(b.acceptanceRate?.replace(/[^0-9.]/g, "") || "100");
        return rateA - rateB;
      });
    default:
      return sorted;
  }
}

type Props = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  availableMajors: string[];
  totalCount: number;
  filteredCount: number;
};

export const DEFAULT_FILTER_STATE = DEFAULT_FILTERS;

export default function DashboardFilters({
  filters, onFiltersChange, sort, onSortChange,
  availableMajors, totalCount, filteredCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeFilterCount = [
    filters.region !== "all",
    filters.size !== "all",
    filters.maxTuition < 80000,
    filters.minAcceptanceRate > 0,
    filters.major !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => onFiltersChange(DEFAULT_FILTERS);

  return (
    <Card className="bg-card border-border shadow-soft overflow-hidden">
      <CardContent className="p-0">
        {/* Compact bar */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <Button
            variant={expanded ? "default" : "outline"}
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-accent text-accent-foreground">
                {activeFilterCount}
              </Badge>
            )}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fitScore">Best Fit</SelectItem>
                <SelectItem value="lowestCost">Lowest Cost</SelectItem>
                <SelectItem value="highestAcceptance">Highest Acceptance Rate</SelectItem>
                <SelectItem value="mostSelective">Most Selective</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground hidden sm:block">
            Showing <span className="font-semibold text-foreground">{filteredCount}</span> of {totalCount}
          </p>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-4 pb-5 pt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Region */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <MapPin className="h-3.5 w-3.5" /> Region
                  </label>
                  <Select value={filters.region} onValueChange={(v) => onFiltersChange({ ...filters, region: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {Object.keys(REGIONS).map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* School Size */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Users className="h-3.5 w-3.5" /> School Size
                  </label>
                  <Select value={filters.size} onValueChange={(v) => onFiltersChange({ ...filters, size: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Any Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Size</SelectItem>
                      <SelectItem value="small">Small (&lt;5,000)</SelectItem>
                      <SelectItem value="medium">Medium (5,000–15,000)</SelectItem>
                      <SelectItem value="large">Large (15,000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Major / Program */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <BookOpen className="h-3.5 w-3.5" /> Major / Program
                  </label>
                  <Select value={filters.major} onValueChange={(v) => onFiltersChange({ ...filters, major: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All Majors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Majors</SelectItem>
                      {availableMajors.slice(0, 20).map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Tuition Slider */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <DollarSign className="h-3.5 w-3.5" /> Max Annual Tuition
                  </label>
                  <div className="px-1">
                    <Slider
                      min={10000}
                      max={80000}
                      step={5000}
                      value={[filters.maxTuition]}
                      onValueChange={([v]) => onFiltersChange({ ...filters, maxTuition: v })}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-1">
                    <span>$10k</span>
                    <span className="font-semibold text-foreground">
                      {filters.maxTuition >= 80000 ? "No limit" : `$${(filters.maxTuition / 1000).toFixed(0)}k`}
                    </span>
                    <span>$80k</span>
                  </div>
                </div>

                {/* Acceptance Rate Slider */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Target className="h-3.5 w-3.5" /> Min Acceptance Rate
                  </label>
                  <div className="px-1">
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[filters.minAcceptanceRate]}
                      onValueChange={([v]) => onFiltersChange({ ...filters, minAcceptanceRate: v })}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-1">
                    <span>0%</span>
                    <span className="font-semibold text-foreground">
                      {filters.minAcceptanceRate === 0 ? "Any" : `${filters.minAcceptanceRate}%+`}
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Reset */}
                <div className="flex items-end">
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground gap-1">
                      <X className="h-3.5 w-3.5" /> Reset all filters
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

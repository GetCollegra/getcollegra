import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Target, Shield, TrendingUp, DollarSign, Wallet, Award,
  Users, BookOpen, Briefcase, Eye, Trash2, ChevronDown, Bookmark,
  GraduationCap, Sparkles, BarChart3, StickyNote,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useCollegePhoto } from "@/hooks/useCollegePhoto";
import { getFallbackForCollege } from "@/lib/campusFallback";
import type { College } from "@/types/college";

type SavedCollege = {
  id: string;
  college_name: string;
  college_data: College;
  status: string;
  notes: string;
};

type Props = {
  saved: SavedCollege;
  index: number;
  fallbackIndex?: number;
  isCompared?: boolean;
  onStatusChange: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  onCompareToggle?: (id: string) => void;
  onOpenNotes?: (id: string) => void;
};

function getInitials(name: string): string {
  const cleaned = name
    .replace(/^The\s+/i, "")
    .replace(/^University of\s+/i, "U ")
    .replace(/^College of\s+/i, "C ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

const fitStyles: Record<
  College["fitCategory"],
  { label: string; cls: string; Icon: typeof Target }
> = {
  Safety: { label: "Likely Admit", cls: "bg-success text-success-foreground", Icon: Shield },
  Match:  { label: "Strong Match", cls: "bg-warning text-warning-foreground", Icon: Target },
  Reach:  { label: "Reach School", cls: "bg-reach text-reach-foreground", Icon: TrendingUp },
};

const STATUS_STYLES: Record<string, string> = {
  Considering: "bg-muted text-muted-foreground",
  Applying:    "bg-primary/10 text-primary",
  Applied:     "bg-accent/10 text-accent-foreground",
  Accepted:    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export default function PremiumSavedRow({
  saved,
  index,
  fallbackIndex,
  isCompared,
  onStatusChange,
  onRemove,
  onCompareToggle,
  onOpenNotes,
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const college = saved.college_data;
  const fit = fitStyles[college.fitCategory] || fitStyles.Match;
  const FitIcon = fit.Icon;
  const initials = getInitials(saved.college_name);
  const bannerClass = `bg-banner-${(index % 6) + 1}`;
  const { url: photoUrl } = useCollegePhoto(saved.college_name);
  const [imgFailed, setImgFailed] = useState(false);
  const fallbackSrc = getFallbackForCollege(saved.college_name, fallbackIndex);
  const resolvedSrc = !imgFailed ? (photoUrl || fallbackSrc) : fallbackSrc;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card className="card-premium overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
          {/* Banner strip */}
          <div className="relative overflow-hidden h-24 sm:h-28 zoom-on-hover">
            <div className={cn("absolute inset-0 zoom-target", bannerClass)} aria-hidden />
            <img
              src={resolvedSrc}
              alt={`${saved.college_name} campus`}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="zoom-target absolute inset-0 w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
            <div className="absolute inset-0 banner-pattern" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" aria-hidden />

            {/* Fit badge top-right */}
            <div className="absolute top-3 right-3">
              <Badge className={cn("border-0 font-semibold gap-1", fit.cls)}>
                <FitIcon className="h-3 w-3" />
                {fit.label}
              </Badge>
            </div>

            {/* "Logo" disc + name overlapping banner */}
            <div className="absolute inset-x-4 bottom-3 flex items-end gap-3 sm:inset-x-5">
              <div className="rounded-2xl bg-white shadow-card grid place-items-center font-bold text-foreground h-12 w-12 text-base shrink-0">
                <span className="text-gradient">{initials}</span>
              </div>
              <div className="min-w-0 pb-1">
                <h3 className="font-bold text-white drop-shadow text-base sm:text-lg leading-tight truncate">
                  {saved.college_name}
                </h3>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{college.location}</span>
                </div>
              </div>
              <div className="ml-auto pb-1 hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/95 shadow-soft text-foreground font-bold tabular-nums text-xs">
                <span className="text-gradient">{college.fitScore}%</span>
                <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">fit</span>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-5 flex flex-col gap-3">
            {/* Mobile fit % row */}
            <div className="flex sm:hidden items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-muted/60 text-foreground font-bold tabular-nums text-xs">
                <span className="text-gradient">{college.fitScore}%</span>
                <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">fit</span>
              </span>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Acceptance", value: college.acceptanceRate, icon: Target },
                { label: "Net Price",  value: college.netPrice, icon: DollarSign },
                { label: "Grad Rate",  value: college.graduationRate, icon: Award },
                { label: "Students",   value: college.studentBody, icon: Users },
              ].map(stat => {
                const Icon = stat.icon;
                const v = stat.value;
                const display = !v || v === "Premium" || v === "—" ? "—" : v;
                return (
                  <div key={stat.label} className="rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      {stat.label}
                    </div>
                    <div className="text-sm font-semibold text-foreground tabular-nums truncate">
                      {display}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Select value={saved.status} onValueChange={(val) => onStatusChange(saved.id, val)}>
                <SelectTrigger className={cn("h-8 text-xs w-[140px] border-0 font-semibold", STATUS_STYLES[saved.status] || "")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Considering">Considering</SelectItem>
                  <SelectItem value="Applying">Applying</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs font-semibold"
                onClick={() => navigate(`/college?name=${encodeURIComponent(saved.college_name)}`)}
              >
                <Eye className="h-3.5 w-3.5" /> Explore
              </Button>

              {onCompareToggle && (
                <Button
                  variant={isCompared ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1 text-xs font-semibold"
                  onClick={() => onCompareToggle(saved.id)}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> {isCompared ? "Comparing" : "Compare"}
                </Button>
              )}

              {onOpenNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs font-semibold"
                  onClick={() => onOpenNotes(saved.id)}
                >
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </Button>
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs ml-auto">
                  Details
                  <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(saved.id)}
                aria-label="Remove from saved"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <CollapsibleContent>
              <div className="border-t border-border/60 pt-4 mt-2 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "In-State Tuition", value: college.tuitionInState, icon: DollarSign },
                    { label: "Out-of-State Tuition", value: college.tuitionOutOfState, icon: DollarSign },
                    { label: "Financial Aid", value: college.avgFinancialAid, icon: Wallet },
                    { label: "Student:Faculty", value: college.studentFacultyRatio, icon: BookOpen },
                    { label: "Campus Size", value: college.campusSize, icon: MapPin },
                    { label: "Setting", value: college.setting, icon: MapPin },
                    { label: "Avg Starting Salary", value: college.avgStartingSalary, icon: Briefcase },
                    { label: "Ranking", value: college.ranking, icon: Award },
                  ].filter(item => {
                    const v = item.value;
                    return v && v !== "Premium" && v !== "N/A" && v !== "See school website" && v !== "—";
                  }).map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-lg p-3 bg-muted/30 border border-border/40">
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                          <Icon className="h-3 w-3" /> {item.label}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    );
                  })}
                </div>

                {college.topPrograms?.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-2 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> Top Programs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {college.topPrograms.map((prog, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-brand-purple/10 text-brand-purple text-[11px] font-semibold px-2.5 py-1">
                          {prog}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-3">
                  {college.whyFit && college.whyFit !== "—" && (
                    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-brand-teal/5 to-brand-purple/5 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-bold text-brand-purple mb-1.5">
                        <Sparkles className="h-3 w-3" /> Why It Fits
                      </div>
                      <p className="text-xs text-foreground/85 leading-relaxed">{college.whyFit}</p>
                    </div>
                  )}
                  {college.campusVibe && college.campusVibe !== "—" && (
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-1.5">Campus Vibe</p>
                      <p className="text-xs text-foreground/85 leading-relaxed">{college.campusVibe}</p>
                    </div>
                  )}
                  {college.notableFeature && college.notableFeature !== "—" && (
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground mb-1.5">Notable</p>
                      <p className="text-xs text-foreground/85 leading-relaxed">{college.notableFeature}</p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {college.prosForStudent?.length > 0 && (
                    <div className="rounded-xl bg-success/5 border border-success/20 p-3">
                      <p className="text-[11px] uppercase tracking-wide font-bold text-success mb-2">✓ Pros</p>
                      <ul className="space-y-1">
                        {college.prosForStudent.slice(0, 4).map((pro, i) => (
                          <li key={i} className="text-xs text-foreground/85 flex items-start gap-1.5">
                            <span className="text-success mt-0.5">•</span>{pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {college.consForStudent?.length > 0 && (
                    <div className="rounded-xl bg-destructive/5 border border-destructive/15 p-3">
                      <p className="text-[11px] uppercase tracking-wide font-bold text-destructive mb-2">✗ Watch Outs</p>
                      <ul className="space-y-1">
                        {college.consForStudent.slice(0, 4).map((con, i) => (
                          <li key={i} className="text-xs text-foreground/85 flex items-start gap-1.5">
                            <span className="text-destructive mt-0.5">•</span>{con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Heart, Bookmark, BookmarkPlus, Eye, BarChart3,
  Target, Shield, TrendingUp, Sparkles, Flame, DollarSign, Star,
  GraduationCap,
} from "lucide-react";
import type { College } from "@/types/college";
import { cn } from "@/lib/utils";
import { useCollegePhoto } from "@/hooks/useCollegePhoto";
import { getFallbackForCollege } from "@/lib/campusFallback";
import { useState } from "react";

type Props = {
  college: College;
  index: number;
  fallbackIndex?: number;
  isSaved: boolean;
  isFeatured?: boolean;
  isCompared?: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onCompareToggle?: () => void;
  showCompare?: boolean;
  /** Simple = just photo, name, location, score, badge, tuition, accept, save/view. */
  simpleView?: boolean;
};

/** Stable initials used inside the banner "logo" badge */
function getInitials(name: string): string {
  // Strip generic "University of"/"College of" prefixes for cleaner initials
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
  Safety: {
    label: "Likely Admit",
    cls: "bg-success text-success-foreground",
    Icon: Shield,
  },
  Match: {
    label: "Strong Match",
    cls: "bg-warning text-warning-foreground",
    Icon: Target,
  },
  Reach: {
    label: "Reach School",
    cls: "bg-reach text-reach-foreground",
    Icon: TrendingUp,
  },
};

/** Pull 2-3 short major tags out of topPrograms */
function getMajorTags(college: College): string[] {
  const programs = college.topPrograms || [];
  return programs
    .filter(p => p && p !== "—" && p !== "Premium")
    .slice(0, 3)
    .map(p => (p.length > 28 ? p.slice(0, 26) + "…" : p));
}

/** Try to detect a "great value" school heuristically — display only */
function isGoodValue(college: College): boolean {
  const np = college.netPrice;
  if (!np || np === "—" || np === "Premium") return false;
  // Match e.g. "$18,500" or "$22k"
  const num = parseInt(np.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(num) && num > 0 && num < 25000;
}

/** Pull pros into bullet insights — fall back to whyFit */
function getInsights(college: College): string[] {
  const pros = (college.prosForStudent || []).filter(Boolean).slice(0, 3);
  if (pros.length >= 2) return pros;
  if (college.whyFit && college.whyFit !== "—") return [college.whyFit];
  return [];
}

export default function PremiumCollegeCard({
  college,
  index,
  fallbackIndex,
  isSaved,
  isFeatured = false,
  isCompared = false,
  onSave,
  onUnsave,
  onCompareToggle,
  showCompare = true,
  simpleView = false,
}: Props) {
  const navigate = useNavigate();
  const fit = fitStyles[college.fitCategory] || fitStyles.Match;
  const FitIcon = fit.Icon;
  const initials = getInitials(college.name);
  const bannerClass = isFeatured
    ? "bg-best-fit"
    : `bg-banner-${(index % 6) + 1}`;
  const majorTags = getMajorTags(college);
  const insights = getInsights(college);
  const trending = college.fitScore >= 90;
  const goodValue = isGoodValue(college);
  const { url: photoUrl } = useCollegePhoto(college.name, fallbackIndex ?? index);
  const [imgFailed, setImgFailed] = useState(false);
  // Always use either the real photo or our local fallback campus image,
  // so cards never look empty.
  const fallbackSrc = getFallbackForCollege(college.name, fallbackIndex);
  const resolvedSrc = !imgFailed ? (photoUrl || fallbackSrc) : fallbackSrc;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: [0.2, 0.8, 0.2, 1] }}
      className={cn("h-full", isFeatured && "lg:col-span-2")}
    >
      <Card
        className={cn(
          "card-premium h-full flex flex-col overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm",
          isFeatured && "glow-best-fit border-transparent",
        )}
      >
        {/* Banner */}
        <div
          className={cn(
            "relative overflow-hidden zoom-on-hover",
            isFeatured ? "h-44 sm:h-56" : "h-32 sm:h-36",
          )}
        >
          {/* Gradient base — always rendered so banner never appears empty */}
          <div className={cn("absolute inset-0 zoom-target", bannerClass)} aria-hidden />
          {/* Campus photo (real photo or local fallback) — always present so cards look polished */}
          <img
            src={resolvedSrc}
            alt={`${college.name} campus`}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="zoom-target absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            onError={() => setImgFailed(true)}
          />
          {/* Subtle dark gradient at bottom for legible overlay text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" aria-hidden />

          {/* Top-left badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
            {isFeatured && (
              <Badge className="bg-white/95 text-foreground border-0 shadow-soft font-semibold gap-1">
                <Star className="h-3 w-3 fill-current text-warning" />
                Best Fit For You
              </Badge>
            )}
            <Badge className={cn("border-0 font-semibold gap-1", fit.cls)}>
              <FitIcon className="h-3 w-3" />
              {fit.label}
            </Badge>
            {!simpleView && trending && !isFeatured && (
              <Badge className="bg-white/90 text-foreground border-0 gap-1">
                <Flame className="h-3 w-3 text-reach" />
                Trending
              </Badge>
            )}
            {!simpleView && goodValue && (
              <Badge className="bg-white/90 text-foreground border-0 gap-1">
                <DollarSign className="h-3 w-3 text-success" />
                Great Value
              </Badge>
            )}
          </div>

          {/* Save heart, top-right */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              isSaved ? onUnsave() : onSave();
            }}
            aria-label={isSaved ? "Remove from saved" : "Save college"}
            className={cn(
              "absolute top-3 right-3 h-9 w-9 rounded-full grid place-items-center transition-all",
              "bg-white/90 hover:bg-white shadow-soft hover:shadow-card backdrop-blur-sm",
              "active:scale-95",
            )}
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isSaved ? "fill-reach text-reach" : "text-foreground",
              )}
            />
          </button>

          {/* "Logo" disc bottom-left overlapping */}
          <div className="absolute -bottom-5 left-4 sm:left-5">
            <div
              className={cn(
                "rounded-2xl bg-white shadow-card grid place-items-center font-bold text-foreground",
                isFeatured ? "h-16 w-16 text-xl" : "h-12 w-12 text-base",
              )}
              aria-hidden
            >
              <span className="text-gradient">{initials}</span>
            </div>
          </div>

          {/* Match score, bottom-right */}
          <div className="absolute bottom-3 right-3">
            <div
              className={cn(
                "rounded-full px-3 py-1.5 bg-white/95 shadow-soft text-foreground font-bold tabular-nums flex items-center gap-1",
                isFeatured ? "text-base" : "text-sm",
              )}
            >
              <span className="text-gradient">{college.fitScore}%</span>
              <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                fit
              </span>
            </div>
          </div>
        </div>

        <CardContent
          className={cn(
            "flex-1 flex flex-col gap-4 pt-8",
            isFeatured ? "p-6 sm:p-7" : "p-5",
          )}
        >
          {/* Title row */}
          <div>
            <h3
              className={cn(
                "font-bold leading-tight text-foreground line-clamp-2",
                isFeatured ? "text-2xl" : "text-lg",
              )}
            >
              {college.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{college.location}</span>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                Acceptance
              </div>
              <div className="text-sm font-semibold text-foreground tabular-nums">
                {college.acceptanceRate || "—"}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                Tuition
              </div>
              <div className="text-sm font-semibold text-foreground tabular-nums truncate">
                {college.tuitionOutOfState && college.tuitionOutOfState !== "Premium"
                  ? college.tuitionOutOfState
                  : college.netPrice && college.netPrice !== "—"
                    ? college.netPrice
                    : "—"}
              </div>
            </div>
          </div>

          {/* Major tags — hidden in Simple View */}
          {!simpleView && majorTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {majorTags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-purple/10 text-brand-purple text-[11px] font-semibold px-2.5 py-1"
                >
                  <GraduationCap className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Why You Match — hidden in Simple View (available on detail page) */}
          {!simpleView && insights.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-brand-teal/5 to-brand-purple/5 p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-bold text-brand-purple mb-1.5">
                <Sparkles className="h-3 w-3" />
                Why You Match
              </div>
              <ul className="space-y-1">
                {insights.map((line, i) => (
                  <li
                    key={i}
                    className="text-xs text-foreground/80 leading-relaxed flex gap-1.5"
                  >
                    <span className="text-brand-teal mt-0.5">•</span>
                    <span className="line-clamp-2">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="col-span-2 bg-gradient-hero text-primary-foreground hover:opacity-95 shadow-soft hover:shadow-card font-semibold"
              onClick={() => navigate(`/college?name=${encodeURIComponent(college.name)}`)}
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
            <Button
              size="sm"
              variant={isSaved ? "outline" : "secondary"}
              className="font-semibold"
              onClick={() => (isSaved ? onUnsave() : onSave())}
            >
              {isSaved ? (
                <>
                  <Bookmark className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            {showCompare && onCompareToggle ? (
              <Button
                size="sm"
                variant={isCompared ? "default" : "outline"}
                className="font-semibold"
                onClick={onCompareToggle}
              >
                <BarChart3 className="h-4 w-4" />
                {isCompared ? "Added" : "Compare"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="font-semibold"
                onClick={() => navigate(`/college?name=${encodeURIComponent(college.name)}`)}
              >
                Explore
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

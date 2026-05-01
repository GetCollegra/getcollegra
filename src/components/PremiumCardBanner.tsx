import { Badge } from "@/components/ui/badge";
import { MapPin, Target, Shield, TrendingUp } from "lucide-react";
import { useCollegePhoto } from "@/hooks/useCollegePhoto";
import { getFallbackForCollege } from "@/lib/campusFallback";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { College } from "@/types/college";

type Size = "sm" | "md" | "lg";

type Props = {
  college: Pick<College, "name" | "location" | "fitCategory" | "fitScore">;
  index?: number;
  fallbackIndex?: number;
  size?: Size;
  showFitScore?: boolean;
  showFitBadge?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
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

const heightCls: Record<Size, string> = {
  sm: "h-20 sm:h-24",
  md: "h-28 sm:h-32",
  lg: "h-32 sm:h-40",
};

const discCls: Record<Size, string> = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-14 w-14 text-lg",
};

const titleCls: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base sm:text-lg",
  lg: "text-lg sm:text-xl",
};

/**
 * Shared banner header shown at the top of premium college cards
 * across the dashboard (saved, insights, notes, compare).
 *
 * Falls back to the gradient + initials disc when no photo is available.
 */
export default function PremiumCardBanner({
  college,
  index = 0,
  fallbackIndex,
  size = "md",
  showFitScore = true,
  showFitBadge = true,
  rightSlot,
  className,
}: Props) {
  const fit = fitStyles[college.fitCategory] || fitStyles.Match;
  const FitIcon = fit.Icon;
  const initials = getInitials(college.name);
  const bannerClass = `bg-banner-${(index % 6) + 1}`;
  const { url: photoUrl } = useCollegePhoto(college.name);
  const [imgFailed, setImgFailed] = useState(false);
  const fallbackSrc = getFallbackForCollege(college.name, fallbackIndex);
  const resolvedSrc = !imgFailed ? (photoUrl || fallbackSrc) : fallbackSrc;

  return (
    <div className={cn("relative overflow-hidden zoom-on-hover", heightCls[size], className)}>
      <div className={cn("absolute inset-0 zoom-target", bannerClass)} aria-hidden />
      <img
        src={resolvedSrc}
        alt={`${college.name} campus`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="zoom-target absolute inset-0 w-full h-full object-cover"
        onError={() => setImgFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" aria-hidden />

      {/* Top-right area: badge + optional slot */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {rightSlot}
        {showFitBadge && (
          <Badge className={cn("border-0 font-semibold gap-1", fit.cls)}>
            <FitIcon className="h-3 w-3" />
            {fit.label}
          </Badge>
        )}
      </div>

      {/* Bottom-left: disc + title */}
      <div className="absolute inset-x-4 bottom-3 flex items-end gap-3 sm:inset-x-5">
        <div className={cn("rounded-2xl bg-white shadow-card grid place-items-center font-bold text-foreground shrink-0", discCls[size])}>
          <span className="text-gradient">{initials}</span>
        </div>
        <div className="min-w-0 pb-1 flex-1">
          <h3 className={cn("font-bold text-white drop-shadow leading-tight truncate", titleCls[size])}>
            {college.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{college.location}</span>
          </div>
        </div>
        {showFitScore && (
          <div className="ml-auto pb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/95 shadow-soft text-foreground font-bold tabular-nums text-xs">
            <span className="text-gradient">{college.fitScore}%</span>
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">fit</span>
          </div>
        )}
      </div>
    </div>
  );
}

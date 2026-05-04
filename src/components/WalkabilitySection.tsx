import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Footprints, MapPin, ChevronDown, Car, Sparkles } from "lucide-react";
import { getWalkability } from "@/lib/collegeExperience";
import type { College } from "@/types/college";

type Props = { college: College };

export default function WalkabilitySection({ college }: Props) {
  const w = useMemo(
    () => getWalkability(college.setting, college.studentBody),
    [college.setting, college.studentBody],
  );
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-card border-border/60 overflow-hidden">
      <div className="h-1 bg-primary" />
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Footprints className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Campus Walkability & Nearby Essentials</h3>
              <p className="text-xs text-muted-foreground">
                {w.estimated ? "Estimated from campus setting" : "From verified data"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold tabular-nums text-primary">
              {w.score}<span className="text-base text-muted-foreground font-semibold">/100</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Walkability</div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {w.badges.map((b) => (
            <Badge key={b} variant="secondary" className="font-medium">{b}</Badge>
          ))}
          <Badge variant="outline" className="gap-1 font-medium">
            <Car className="h-3 w-3" /> Car needed: {w.carNeeded}%
          </Badge>
        </div>

        {/* Scrollable cards */}
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex gap-3 px-1 min-w-min">
            {w.cards.map((c) => (
              <div
                key={c.key}
                className="shrink-0 w-44 sm:w-48 rounded-xl border border-border/60 bg-muted/20 p-3.5 hover:border-primary/40 hover:shadow-soft transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl" aria-hidden>{c.icon}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {c.score}<span className="text-xs text-muted-foreground">/10</span>
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{c.label}</p>
                <p className="text-[11px] text-primary font-medium mt-0.5">{c.distance}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${c.score * 10}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-snug line-clamp-3">{c.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mini map placeholder */}
        <div className="relative rounded-xl border border-dashed border-border/70 bg-muted/30 h-24 flex items-center justify-center overflow-hidden">
          <div className="relative flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Mini map preview — explore the full map in the Map tab
          </div>
        </div>

        {/* What students will notice */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> What students will notice
          </p>
          <ul className="space-y-1.5">
            {w.notices.map((n, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />{n}
              </li>
            ))}
          </ul>
        </div>

        {/* Best Nearby (collapsible) */}
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold hover:bg-muted/50 transition-colors">
            <span>Best Nearby — top picks</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ul className="grid sm:grid-cols-2 gap-2">
              {[...w.cards].sort((a, b) => b.score - a.score).slice(0, 4).map((c) => (
                <li key={c.key} className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
                  <span className="text-xl">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.distance}</p>
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">{c.score}/10</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

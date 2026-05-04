import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Users, Star } from "lucide-react";
import { useEffect } from "react";
import { getCollegeSports, sportEmoji } from "@/lib/collegeSports";
import { capture } from "@/lib/posthog";
import type { College } from "@/types/college";

type Props = {
  college: College;
  /** When true, shows "Athletic Opportunities" recruiting block */
  showRecruiting?: boolean;
};

export default function SportsSection({ college, showRecruiting = false }: Props) {
  const sports = getCollegeSports(college.name, college.studentBody, college.setting);

  useEffect(() => {
    capture("sports_section_view", { college: college.name, division: sports.division });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [college.name]);

  const score = sports.cultureScore;

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-200/40 dark:border-orange-800/30 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
      <CardContent className="p-5 pt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
            <Trophy className="h-4 w-4" /> Sports & Athletics
          </p>
          <div className="flex items-center gap-1" aria-label={`School spirit ${score} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < score ? "text-orange-500 fill-orange-500" : "text-muted-foreground/30"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">School Spirit</span>
          </div>
        </div>

        {/* Division + Conference */}
        <p className="text-sm text-foreground font-semibold">
          NCAA Division {sports.division} • {sports.conference}
        </p>

        {/* Game day description */}
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{sports.gameDay}</p>

        {/* Sport tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {sports.popularSports.map((sport) => {
            const isKnown = sports.knownFor?.includes(sport);
            return (
              <Badge
                key={sport}
                className={
                  isKnown
                    ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30 text-xs"
                    : "bg-muted text-foreground border-border text-xs"
                }
              >
                <span className="mr-1">{sportEmoji(sport)}</span>
                {sport}
              </Badge>
            );
          })}
        </div>

        {/* Culture badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {sports.badges.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-white/5 border border-border/60 text-[11px] font-medium px-2.5 py-1 text-foreground"
            >
              {b === "Strong Sports Culture" && <Flame className="h-3 w-3 text-orange-500" />}
              {b === "Big Game Atmosphere" && <Trophy className="h-3 w-3 text-amber-500" />}
              {b === "Student-Athlete Support" && <Users className="h-3 w-3 text-primary" />}
              {b === "Competitive Programs" && <Star className="h-3 w-3 text-yellow-500" />}
              {b}
            </span>
          ))}
        </div>

        {/* Optional recruiting block */}
        {showRecruiting && (
          <div
            className="mt-4 rounded-lg border border-orange-500/30 bg-white/60 dark:bg-white/5 p-3"
            onClick={() => capture("athlete_interest_click", { college: college.name })}
          >
            <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-2">
              Athletic Opportunities
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              <li>• Club sports available</li>
              <li>• Active intramural participation</li>
              <li>
                • Varsity competitiveness:{" "}
                {sports.division === "I"
                  ? "High — Division I"
                  : sports.division === "II"
                    ? "Moderate — Division II"
                    : "Recreational-leaning — Division III"}
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Contact coaches directly for recruitment info.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, Users, Star, Building2, Sparkles, Medal } from "lucide-react";
import { useEffect, useMemo } from "react";
import { getCollegeSports, sportEmoji, type SportsTeam } from "@/lib/collegeSports";
import { capture } from "@/lib/posthog";
import type { College } from "@/types/college";

type Props = {
  college: College;
  /** When true, shows recruiting/personalization hints */
  showRecruiting?: boolean;
  /** Sport names the student personally cares about (lowercased keywords ok) */
  highlightSports?: string[];
};

const compColor: Record<SportsTeam["competitiveness"], string> = {
  Low: "bg-muted text-muted-foreground",
  Moderate: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  High: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  Elite: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
};

export default function SportsSection({ college, showRecruiting = false, highlightSports = [] }: Props) {
  const sports = useMemo(
    () => getCollegeSports(college.name, college.studentBody, college.setting),
    [college.name, college.studentBody, college.setting],
  );

  useEffect(() => {
    capture("sports_section_view", { college: college.name, division: sports.division });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [college.name]);

  const score = sports.cultureScore;

  // Personalized highlight: the user's interest matched against teams
  const personalized = useMemo(() => {
    if (!highlightSports?.length) return null;
    const hay = highlightSports.map((s) => s.toLowerCase());
    return sports.teams.find((t) => hay.some((h) => t.sport.toLowerCase().includes(h)));
  }, [highlightSports, sports.teams]);

  return (
    <Card className="bg-card border-l-[3px] border-l-cat-athletics border-border/60 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-cat-athletics/70" />
      <CardContent className="p-5 pt-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
            <Trophy className="h-4 w-4" /> Athletics Hub
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

        {/* Always-visible summary */}
        <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-border/60 p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-foreground">
                NCAA Division {sports.division} • {sports.conference}
              </p>
              {sports.mascot && (
                <p className="text-xs text-muted-foreground mt-0.5">Mascot: {sports.mascot}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{sports.gameDay}</p>
            </div>
            {sports.colors && sports.colors.length > 0 && (
              <div className="flex items-center gap-1.5" aria-label="School colors">
                {sports.colors.map((c) => (
                  <span
                    key={c}
                    className="h-5 w-5 rounded-full border border-border/60 shadow-sm"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Culture progress bar */}
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-cat-athletics"
                style={{ width: `${(score / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sports.badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-background border border-border/60 text-[11px] font-medium px-2.5 py-0.5 text-foreground"
              >
                {b === "Strong Sports Culture" && <Flame className="h-3 w-3 text-orange-500" />}
                {b === "Big Game Atmosphere" && <Trophy className="h-3 w-3 text-amber-500" />}
                {b === "Student-Athlete Support" && <Users className="h-3 w-3 text-primary" />}
                {b === "Competitive Programs" && <Star className="h-3 w-3 text-yellow-500" />}
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Personalized highlight */}
        {personalized && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">{personalized.sport}</span> at this school is{" "}
              <span className="font-semibold text-primary">
                {personalized.competitiveness.toLowerCase()}
              </span>
              -level — {personalized.recruitment.toLowerCase()}.
            </p>
          </div>
        )}

        {/* Tabbed deep dive */}
        <Tabs
          defaultValue="overview"
          onValueChange={(v) => capture("sports_tab_change", { college: college.name, tab: v })}
        >
          <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs rounded-md">Overview</TabsTrigger>
            <TabsTrigger value="teams" className="text-xs rounded-md">Teams</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs rounded-md">Wins</TabsTrigger>
            <TabsTrigger value="facilities" className="text-xs rounded-md">Facilities</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-3">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
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
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Student Experience
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{sports.experienceNotes}</p>
              </div>
            </div>
          </TabsContent>

          {/* Teams */}
          <TabsContent value="teams" className="mt-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {sports.teams.map((t) => (
                <div
                  key={t.sport}
                  className="rounded-lg border border-border/60 bg-background/60 p-3 flex items-center gap-3"
                >
                  <span className="text-xl shrink-0" aria-hidden>{sportEmoji(t.sport)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{t.sport}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Div {t.division} • {t.recruitment}
                    </p>
                  </div>
                  <Badge className={`text-[10px] border-0 ${compColor[t.competitiveness]}`}>
                    {t.competitiveness}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Achievements */}
          <TabsContent value="achievements" className="mt-3">
            <ul className="space-y-2">
              {sports.achievements.map((a, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground rounded-lg border border-border/60 bg-background/60 p-3"
                >
                  <Medal className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </TabsContent>

          {/* Facilities */}
          <TabsContent value="facilities" className="mt-3">
            <ul className="space-y-2">
              {sports.facilities.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground rounded-lg border border-border/60 bg-background/60 p-3"
                >
                  <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>

        {/* Optional recruiting block */}
        {showRecruiting && (
          <div
            className="rounded-lg border border-orange-500/30 bg-white/60 dark:bg-white/5 p-3"
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

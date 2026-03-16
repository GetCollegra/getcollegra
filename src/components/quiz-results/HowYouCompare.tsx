import { motion } from "framer-motion";
import { Trophy, TrendingUp, Users, Zap, Star } from "lucide-react";
import type { Recommendations } from "@/types/college";

interface HowYouCompareProps {
  surveyContext: Record<string, string>;
  recommendations: Recommendations;
  firstName?: string;
}

type LeaderboardRow = { trait: string; you: string; avg: string; icon: typeof Star };

function deriveComparison(
  surveyContext: Record<string, string>,
  recommendations: Recommendations
) {
  const p = (key: string, alt?: string) => {
    const v = surveyContext[key] || (alt ? surveyContext[alt] : "") || "";
    return v.trim().toLowerCase();
  };

  const has = (val: string, ...kw: string[]) => kw.some((k) => val.includes(k.toLowerCase()));

  const colleges = recommendations.colleges || [];
  const avgFit = colleges.length > 0 ? Math.round(colleges.reduce((s, c) => s + (c.fitScore || 0), 0) / colleges.length) : 75;

  // Count meaningful (non-default) answers
  const filledPrefs = Object.values(surveyContext).filter(
    (v) => v && !["no preference", "undecided", "none"].includes(v.trim().toLowerCase())
  ).length;
  const rarity = Math.min(97, Math.max(12, Math.round(filledPrefs * 5.5 + avgFit * 0.25)));

  // Derive strongest traits from actual Tally answers
  const academic = p("academicImportance", "academic_importance");
  const acceptance = p("acceptanceRatePref", "acceptance_rate_pref");
  const maxCost = p("maxCost", "max_cost");
  const finAid = p("financialAid", "financial_aid");
  const campusLife = p("campusLife", "campus_life");
  const campusVibe = p("campusVibe", "campus_vibe");
  const distance = p("distanceFromHome", "distance_from_home");
  const areaOfStudy = p("areaOfStudy", "area_of_study");

  const strongestTraits: string[] = [];

  if (has(academic, "top priority", "very important")) strongestTraits.push("Academic Drive");
  if (has(acceptance, "highly selective", "very selective")) strongestTraits.push("High Ambition");
  if (has(maxCost, "under $10", "$10,000-$20") || has(finAid, "essential", "very important")) strongestTraits.push("Budget Savvy");
  if (has(campusVibe, "big school", "sports and school spirit") || has(campusLife, "athletics", "greek")) strongestTraits.push("Social Energy");
  if (has(campusVibe, "creative", "artsy") || has(campusLife, "fine arts", "student media")) strongestTraits.push("Creative Spirit");
  if (has(campusLife, "research") || has(areaOfStudy, "stem", "computer", "pre-med")) strongestTraits.push("Research Minded");
  if (has(campusLife, "internship", "career")) strongestTraits.push("Career Focused");
  if (has(distance, "under 1", "up to 3")) strongestTraits.push("Close to Home");
  if (has(distance, "anywhere")) strongestTraits.push("Wanderlust");
  if (has(campusLife, "study abroad")) strongestTraits.push("Global Curiosity");
  if (has(campusLife, "community service")) strongestTraits.push("Community Heart");

  // Keep top 4, ensure at least 2
  const topTraits = strongestTraits.slice(0, 4);
  if (topTraits.length === 0) topTraits.push("Balanced Approach", "Open-Minded");
  if (topTraits.length === 1) topTraits.push("Self-Aware");

  const leaderboard: LeaderboardRow[] = [
    { trait: "Match Quality", you: `${avgFit}%`, avg: "68%", icon: Star },
    { trait: "Preference Clarity", you: `${Math.min(95, filledPrefs * 7)}%`, avg: "52%", icon: Zap },
    { trait: "Research Depth", you: colleges.length >= 5 ? "Top 15%" : "Top 30%", avg: "Top 50%", icon: TrendingUp },
  ];

  return { rarity, strongestTraits: topTraits, leaderboard };
}

const HowYouCompare = ({ surveyContext, recommendations, firstName }: HowYouCompareProps) => {
  const { rarity, strongestTraits, leaderboard } = deriveComparison(surveyContext, recommendations);

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-muted/20">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-semibold mb-3"
          >
            <Trophy className="w-4 h-4" />
            How You Compare
          </motion.div>
          <h2 className="font-display text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            {firstName ? `${firstName}, see` : "See"} where you stand
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Compared to thousands of students who've taken the Collegra quiz
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Rarity card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-soft text-center"
          >
            <motion.span
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-4"
            >
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </motion.span>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium mb-1">Your Profile Rarity</p>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-gradient mb-2 py-1 leading-tight"
            >
              Top {100 - rarity}%
            </motion.p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Your combination of preferences is more unique than {rarity}% of students
            </p>
          </motion.div>

          {/* Strongest traits */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-soft"
          >
            <h3 className="font-display text-base sm:text-lg font-bold text-foreground mb-4 text-center">
              Your Strongest Traits
            </h3>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {strongestTraits.map((trait, i) => (
                <motion.span
                  key={trait}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, type: "spring" }}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold border border-primary/15"
                >
                  {trait}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Mini leaderboard table */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft"
          >
            <div className="p-5 sm:p-6 pb-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground text-center">
                Mini Leaderboard
              </h3>
            </div>
            <div className="p-4 sm:p-6">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 text-muted-foreground font-semibold">Metric</th>
                    <th className="text-center py-2.5 px-3 text-primary font-semibold">You</th>
                    <th className="text-center py-2.5 px-3 text-muted-foreground font-semibold">Avg Student</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, i) => {
                    const Icon = row.icon;
                    return (
                      <motion.tr
                        key={row.trait}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + i * 0.08 }}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 px-3 text-foreground font-medium">
                          <span className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {row.trait}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-primary">{row.you}</td>
                        <td className="py-3 px-3 text-center text-muted-foreground">{row.avg}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HowYouCompare;

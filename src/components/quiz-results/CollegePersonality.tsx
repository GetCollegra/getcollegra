import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { College, Recommendations } from "@/types/college";

// Personality archetypes derived from quiz answers + match results
const PERSONALITIES = [
  {
    id: "trailblazer",
    name: "The Trailblazer",
    emoji: "🚀",
    description: "You chase big dreams and aren't afraid to aim high. You thrive in competitive environments where ambition meets opportunity.",
  },
  {
    id: "scholar",
    name: "The Focused Scholar",
    emoji: "📚",
    description: "Academics come first for you. You want a school where learning is serious, professors are accessible, and research opportunities abound.",
  },
  {
    id: "explorer",
    name: "The Campus Explorer",
    emoji: "🌍",
    description: "You want the full college experience — campus life, clubs, community, and connection. The vibe matters as much as the degree.",
  },
  {
    id: "strategist",
    name: "The Smart Strategist",
    emoji: "🧠",
    description: "You balance ambition with practicality. Value for money, career outcomes, and smart choices define your college search.",
  },
  {
    id: "homegrown",
    name: "The Hometown Hero",
    emoji: "🏡",
    description: "Staying close to your roots matters. You want a great education without straying too far from family and community.",
  },
  {
    id: "adventurer",
    name: "The Adventurer",
    emoji: "🧭",
    description: "You want to explore new places and break out of your comfort zone. A fresh city, new culture, and big campus energy call to you.",
  },
  {
    id: "creative",
    name: "The Creative Visionary",
    emoji: "🎨",
    description: "You see the world differently. Whether it's art, design, writing, or music — you want a campus that nurtures your creative fire.",
  },
  {
    id: "dreamer",
    name: "The Big Dreamer",
    emoji: "✨",
    description: "You're open to possibilities and ready for whatever college life throws your way. Your curiosity is your superpower.",
  },
];

type TraitBar = { label: string; value: number; color: string };

/** Grab a quiz answer from either camelCase or snake_case key */
const pref = (ctx: Record<string, string>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = ctx[k];
    if (typeof v === "string" && v.trim() && v.trim() !== "No preference" && v.trim() !== "Undecided") return v.trim().toLowerCase();
  }
  return "";
};

/** Check if a preference string includes any of the given keywords */
const includes = (val: string, ...keywords: string[]) =>
  keywords.some((kw) => val.includes(kw));

export function derivePersonality(
  surveyContext: Record<string, string>,
  recommendations: Recommendations
): { personality: typeof PERSONALITIES[0]; traits: TraitBar[] } {
  const colleges = recommendations.colleges || [];

  // ── Extract quiz answers ──
  const distance = pref(surveyContext, "distanceFromHome", "distance_from_home");
  const maxCost = pref(surveyContext, "maxCost", "max_cost");
  const campusLife = pref(surveyContext, "campusLife", "campus_life");
  const academic = pref(surveyContext, "academicImportance", "academic_importance");
  const acceptance = pref(surveyContext, "acceptanceRatePref", "acceptance_rate_pref");
  const finAid = pref(surveyContext, "financialAid", "financial_aid");
  const campusVibe = pref(surveyContext, "campusVibe", "campus_vibe");
  const campusSize = pref(surveyContext, "campusSize", "campus_size");
  const locationType = pref(surveyContext, "locationType", "location_type");
  const areaOfStudy = pref(surveyContext, "areaOfStudy", "area_of_study");
  const gpa = pref(surveyContext, "gpa");

  // ── Derive signals from answers ──
  const hasReach = colleges.some((c) => c.fitCategory === "Reach");
  const avgFit = colleges.length > 0 ? colleges.reduce((s, c) => s + (c.fitScore || 0), 0) / colleges.length : 75;

  const wantsCloseToHome = includes(distance, "close", "100", "50", "near", "state", "short");
  const wantsFarFromHome = includes(distance, "far", "anywhere", "500", "1000", "no limit", "doesn't matter", "coast");

  const isCostConscious = includes(maxCost, "under", "low", "cheap", "affordable", "15", "20", "10") ||
    includes(finAid, "very", "extremely", "essential", "critical");

  const isCampusLifeFocused = includes(campusLife, "very", "extremely", "essential", "love", "huge") ||
    includes(campusVibe, "social", "greek", "party", "active", "spirited", "lively");

  const isAcademicFocused = includes(academic, "very", "extremely", "essential", "most", "top") ||
    includes(campusVibe, "academic", "studious", "intellectual", "research");

  const isCompetitive = includes(acceptance, "selective", "competitive", "30", "20", "10", "elite", "top") ||
    (gpa && parseFloat(gpa) >= 3.7);

  const isCreative = includes(areaOfStudy, "art", "design", "music", "theater", "theatre", "film", "creative", "media", "writing", "communications");

  const wantsBigCity = includes(locationType, "urban", "city", "metro", "downtown");
  const wantsLargeCampus = includes(campusSize, "large", "big", "20,000", "30,000", "major");

  // ── Score each personality archetype ──
  const scores: Record<string, number> = {
    trailblazer: 0,
    scholar: 0,
    explorer: 0,
    strategist: 0,
    homegrown: 0,
    adventurer: 0,
    creative: 0,
    dreamer: 0,
  };

  // Trailblazer — competitive + high GPA + reach schools
  if (isCompetitive) scores.trailblazer += 3;
  if (hasReach) scores.trailblazer += 2;
  if (gpa && parseFloat(gpa) >= 3.5) scores.trailblazer += 1;

  // Scholar — academic focus
  if (isAcademicFocused) scores.scholar += 3;
  if (includes(campusVibe, "research", "studious", "intellectual")) scores.scholar += 2;
  if (!isCampusLifeFocused) scores.scholar += 1;

  // Explorer — campus life + social vibe
  if (isCampusLifeFocused) scores.explorer += 3;
  if (wantsLargeCampus) scores.explorer += 1;
  if (includes(campusVibe, "diverse", "inclusive", "community")) scores.explorer += 1;

  // Strategist — cost-conscious + practical
  if (isCostConscious) scores.strategist += 3;
  if (!isCompetitive && !wantsFarFromHome) scores.strategist += 1;
  if (avgFit > 80) scores.strategist += 1;

  // Hometown Hero — close to home
  if (wantsCloseToHome) scores.homegrown += 4;
  if (includes(campusSize, "small", "medium")) scores.homegrown += 1;

  // Adventurer — far from home + big city + large campus
  if (wantsFarFromHome) scores.adventurer += 3;
  if (wantsBigCity) scores.adventurer += 2;
  if (wantsLargeCampus) scores.adventurer += 1;

  // Creative — arts/design/media
  if (isCreative) scores.creative += 4;
  if (includes(campusVibe, "creative", "artistic", "expressive")) scores.creative += 2;

  // Dreamer baseline (fallback)
  scores.dreamer += 1;

  // Pick the highest scoring personality
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const winnerId = sorted[0][1] > 1 ? sorted[0][0] : "dreamer";
  const personality = PERSONALITIES.find((p) => p.id === winnerId) || PERSONALITIES[PERSONALITIES.length - 1];

  // ── Derive trait bars from actual quiz answers ──
  const ambition = Math.min(98, Math.max(35,
    (isCompetitive ? 30 : 0) + (hasReach ? 20 : 0) + (isAcademicFocused ? 15 : 0) +
    (gpa ? Math.round(parseFloat(gpa) * 12) : 30) + 20
  ));

  const practicality = Math.min(95, Math.max(30,
    (isCostConscious ? 30 : 0) + (wantsCloseToHome ? 20 : 0) +
    (!isCompetitive ? 10 : 0) + Math.round(avgFit * 0.35) + 10
  ));

  const adventureSpirit = Math.min(96, Math.max(25,
    (wantsFarFromHome ? 30 : 0) + (wantsBigCity ? 20 : 0) +
    (isCampusLifeFocused ? 15 : 0) + (wantsLargeCampus ? 10 : 0) +
    (!wantsCloseToHome ? 15 : 0) + 10
  ));

  const traits: TraitBar[] = [
    { label: "Ambition", value: ambition, color: "bg-primary" },
    { label: "Practicality", value: practicality, color: "bg-accent" },
    { label: "Adventure Spirit", value: adventureSpirit, color: "bg-emerald-500" },
  ];

  return { personality, traits };
}

interface CollegePersonalityProps {
  surveyContext: Record<string, string>;
  recommendations: Recommendations;
  firstName?: string;
}

const CollegePersonality = ({ surveyContext, recommendations, firstName }: CollegePersonalityProps) => {
  const { personality, traits } = derivePersonality(surveyContext, recommendations);

  return (
    <section className="py-10 sm:py-14 md:py-20 bg-gradient-subtle">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          {/* Section label */}
          <div className="text-center mb-5 sm:mb-6">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3"
            >
              <Sparkles className="w-4 h-4" />
              Your College Personality
            </motion.div>
          </div>

          {/* Personality card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl sm:rounded-3xl blur-lg opacity-60" />
            <div className="relative bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-card overflow-hidden">
              {/* Decorative corner glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />

              {/* Emoji + Name */}
              <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 12 }}
                  className="text-5xl sm:text-6xl mb-3 sm:mb-4 block"
                >
                  {personality.emoji}
                </motion.span>
                <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {firstName ? `${firstName}, you're` : "You're"}{" "}
                  <span className="text-gradient">{personality.name}</span>
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
                  {personality.description}
                </p>
              </div>

              {/* Trait bars */}
              <div className="space-y-4 sm:space-y-5">
                {traits.map((trait, i) => (
                  <motion.div
                    key={trait.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-foreground text-xs sm:text-sm font-semibold">{trait.label}</span>
                      <span className="text-muted-foreground text-xs sm:text-sm font-bold">{trait.value}%</span>
                    </div>
                    <div className="h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${trait.value}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${trait.color}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CollegePersonality;

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
    triggers: { reach: true, competitive: true },
  },
  {
    id: "scholar",
    name: "The Focused Scholar",
    emoji: "📚",
    description: "Academics come first for you. You want a school where learning is serious, professors are accessible, and research opportunities abound.",
    triggers: { academic: true },
  },
  {
    id: "explorer",
    name: "The Campus Explorer",
    emoji: "🌍",
    description: "You want the full college experience — campus life, clubs, community, and connection. The vibe matters as much as the degree.",
    triggers: { campusLife: true },
  },
  {
    id: "strategist",
    name: "The Smart Strategist",
    emoji: "🧠",
    description: "You balance ambition with practicality. Value for money, career outcomes, and smart choices define your college search.",
    triggers: { value: true },
  },
  {
    id: "homegrown",
    name: "The Hometown Hero",
    emoji: "🏡",
    description: "Staying close to your roots matters. You want a great education without straying too far from family and community.",
    triggers: { closeToHome: true },
  },
  {
    id: "dreamer",
    name: "The Big Dreamer",
    emoji: "✨",
    description: "You're open to possibilities and ready for whatever college life throws your way. Your curiosity is your superpower.",
    triggers: { default: true },
  },
];

type TraitBar = { label: string; value: number; color: string };

function derivePersonality(
  surveyContext: Record<string, string>,
  recommendations: Recommendations
): { personality: typeof PERSONALITIES[0]; traits: TraitBar[] } {
  const colleges = recommendations.colleges || [];
  const prefs = surveyContext;

  // Derive signals
  const hasReach = colleges.some((c) => c.fitCategory === "Reach");
  const avgFit = colleges.length > 0 ? colleges.reduce((s, c) => s + (c.fitScore || 0), 0) / colleges.length : 75;
  const wantsCloseToHome = ["< 100 miles", "Under 100 miles", "Close to home", "Within my state"].some(
    (v) => (prefs.distanceFromHome || prefs.distance_from_home || "").toLowerCase().includes(v.toLowerCase())
  );
  const costFocused = ["Under $15,000", "Under $20,000", "Affordable", "Low cost"].some(
    (v) => (prefs.maxCost || prefs.max_cost || "").toLowerCase().includes(v.toLowerCase())
  );
  const campusLifeFocused = ["Very important", "Extremely important"].some(
    (v) => (prefs.campusLife || prefs.campus_life || "").toLowerCase().includes(v.toLowerCase())
  );
  const academicFocused = ["Very important", "Extremely important"].some(
    (v) => (prefs.academicImportance || prefs.academic_importance || "").toLowerCase().includes(v.toLowerCase())
  );
  const competitivePref = ["Highly selective", "Competitive", "< 30%"].some(
    (v) => (prefs.acceptanceRatePref || prefs.acceptance_rate_pref || "").toLowerCase().includes(v.toLowerCase())
  );

  // Pick personality
  let personality = PERSONALITIES[PERSONALITIES.length - 1]; // default dreamer
  if (hasReach && competitivePref) personality = PERSONALITIES[0]; // trailblazer
  else if (academicFocused) personality = PERSONALITIES[1]; // scholar
  else if (campusLifeFocused) personality = PERSONALITIES[2]; // explorer
  else if (costFocused) personality = PERSONALITIES[3]; // strategist
  else if (wantsCloseToHome) personality = PERSONALITIES[4]; // homegrown

  // Derive trait bars
  const ambition = Math.min(98, Math.max(40, hasReach ? 88 : competitivePref ? 82 : Math.round(avgFit * 0.9)));
  const practicality = Math.min(95, Math.max(35, costFocused ? 91 : wantsCloseToHome ? 85 : 62));
  const adventureSpirit = Math.min(96, Math.max(30, campusLifeFocused ? 89 : !wantsCloseToHome ? 78 : 45));

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

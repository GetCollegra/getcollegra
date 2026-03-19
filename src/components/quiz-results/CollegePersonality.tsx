import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Share2, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { College, Recommendations } from "@/types/college";

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
    id: "connector",
    name: "The Social Connector",
    emoji: "🤝",
    description: "You light up every room. Greek life, athletics, school spirit — you want a campus buzzing with energy and connection.",
  },
  {
    id: "dreamer",
    name: "The Big Dreamer",
    emoji: "✨",
    description: "You're open to possibilities and ready for whatever college life throws your way. Your curiosity is your superpower.",
  },
];

type TraitBar = { label: string; value: number; color: string };

/** Grab a quiz answer from either camelCase or snake_case key, lowercased */
const pref = (ctx: Record<string, string>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = ctx[k];
    if (typeof v === "string" && v.trim()) return v.trim().toLowerCase();
  }
  return "";
};

const has = (val: string, ...keywords: string[]) =>
  keywords.some((kw) => val.includes(kw.toLowerCase()));

export function derivePersonality(
  surveyContext: Record<string, string>,
  recommendations: Recommendations
): { personality: typeof PERSONALITIES[0]; traits: TraitBar[] } {
  const colleges = recommendations.colleges || [];

  // ── Read actual Tally quiz answers ──
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

  // ── Derive boolean signals from exact Tally option values ──
  const hasReach = colleges.some((c) => c.fitCategory === "Reach");
  const avgFit = colleges.length > 0 ? colleges.reduce((s, c) => s + (c.fitScore || 0), 0) / colleges.length : 75;

  // Distance: "under 1 hour" / "up to 3 hours" = close; "anywhere in the u.s" / "up to 10 hours" = far
  const wantsCloseToHome = has(distance, "under 1", "up to 3");
  const wantsFarFromHome = has(distance, "anywhere", "up to 10");

  // Cost: "under $10,000" / "$10,000-$20,000" = budget-conscious
  const isCostConscious = has(maxCost, "under $10", "$10,000-$20") || has(finAid, "essential", "very important");

  // Campus vibe: exact Tally options
  const isSportsSpirit = has(campusVibe, "big school with lots of sports", "sports and school spirit");
  const isBalanced = has(campusVibe, "balanced academics and social");
  const isQuietAcademic = has(campusVibe, "academically focused and quieter");
  const isCreativeArtsy = has(campusVibe, "creative", "artsy");
  const isTightKnit = has(campusVibe, "tight-knit", "community feel");

  // Campus life interests (multi-select, may be comma-separated)
  const hasAthletics = has(campusLife, "athletics", "sports");
  const hasGreekLife = has(campusLife, "greek");
  const hasResearch = has(campusLife, "research");
  const hasFineArts = has(campusLife, "fine arts");
  const hasStudentMedia = has(campusLife, "student media", "newspaper", "radio", "film");
  const hasStudyAbroad = has(campusLife, "study abroad");
  const hasInternships = has(campusLife, "internship", "career networking");
  const hasSchoolSpirit = has(campusLife, "school spirit");
  const hasClubs = has(campusLife, "student clubs", "intramural");
  const hasCommunityService = has(campusLife, "community service");

  // Academics importance: "top priority" / "very important" = high
  const isAcademicFocused = has(academic, "top priority", "very important");

  // Acceptance rate: "highly selective 10-25" / "very selective 10<" = competitive
  const isCompetitive = has(acceptance, "highly selective", "very selective");
  const isModerate = has(acceptance, "moderately selective", "selective 25");

  // Area of study
  const isCreativeStudy = has(areaOfStudy, "creative arts", "design");
  const isSTEM = has(areaOfStudy, "stem", "computer science", "engineering", "math");
  const isBusiness = has(areaOfStudy, "business", "economics");
  const isPreMed = has(areaOfStudy, "pre-med", "health");
  const isHumanities = has(areaOfStudy, "humanities", "history", "english", "philosophy");

  // Campus size
  const isLargeCampus = has(campusSize, "large", "very large", "30,000");
  const isSmallCampus = has(campusSize, "small", "fewer than 5,000");

  // Location
  const wantsBigCity = has(locationType, "big city");

  // High GPA
  const gpaNum = gpa ? parseFloat(gpa) : 0;
  const highGPA = gpaNum >= 3.7;

  // ── Score each archetype ──
  const scores: Record<string, number> = {
    trailblazer: 0, scholar: 0, explorer: 0, strategist: 0,
    homegrown: 0, adventurer: 0, creative: 0, connector: 0, dreamer: 1,
  };

  // Trailblazer: competitive schools + high GPA + reach
  if (isCompetitive) scores.trailblazer += 4;
  if (hasReach) scores.trailblazer += 2;
  if (highGPA) scores.trailblazer += 2;
  if (isAcademicFocused && isCompetitive) scores.trailblazer += 1;

  // Scholar: academic focus + research + quiet vibe
  if (isAcademicFocused) scores.scholar += 3;
  if (isQuietAcademic) scores.scholar += 3;
  if (hasResearch) scores.scholar += 2;
  if (isSTEM || isPreMed) scores.scholar += 1;
  if (isSmallCampus) scores.scholar += 1;

  // Explorer: balanced + clubs + study abroad + large campus
  if (isBalanced) scores.explorer += 2;
  if (hasStudyAbroad) scores.explorer += 3;
  if (hasClubs) scores.explorer += 2;
  if (hasCommunityService) scores.explorer += 1;
  if (isLargeCampus) scores.explorer += 1;
  if (wantsBigCity) scores.explorer += 1;

  // Strategist: cost-conscious + internships + practical
  if (isCostConscious) scores.strategist += 4;
  if (hasInternships) scores.strategist += 2;
  if (isBusiness) scores.strategist += 2;
  if (isModerate) scores.strategist += 1;

  // Hometown Hero: close to home + small/tight-knit
  if (wantsCloseToHome) scores.homegrown += 5;
  if (isTightKnit) scores.homegrown += 2;
  if (isSmallCampus) scores.homegrown += 1;

  // Adventurer: far from home + big city + large campus
  if (wantsFarFromHome) scores.adventurer += 4;
  if (wantsBigCity) scores.adventurer += 2;
  if (isLargeCampus) scores.adventurer += 1;
  if (hasStudyAbroad) scores.adventurer += 1;

  // Creative Visionary: artsy vibe + fine arts + creative studies + student media
  if (isCreativeArtsy) scores.creative += 4;
  if (hasFineArts) scores.creative += 3;
  if (isCreativeStudy) scores.creative += 3;
  if (hasStudentMedia) scores.creative += 2;
  if (isHumanities) scores.creative += 1;

  // Social Connector: sports + greek + school spirit + big campus
  if (isSportsSpirit) scores.connector += 4;
  if (hasGreekLife) scores.connector += 3;
  if (hasAthletics) scores.connector += 2;
  if (hasSchoolSpirit) scores.connector += 2;
  if (isLargeCampus) scores.connector += 1;

  // Pick highest
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const winnerId = sorted[0][1] > 1 ? sorted[0][0] : "dreamer";
  const personality = PERSONALITIES.find((p) => p.id === winnerId) || PERSONALITIES[PERSONALITIES.length - 1];

  // ── Trait bars derived from actual answers ──
  const ambition = Math.min(98, Math.max(30,
    (isCompetitive ? 30 : isModerate ? 15 : 5) +
    (hasReach ? 15 : 0) +
    (isAcademicFocused ? 15 : 0) +
    (highGPA ? 15 : gpaNum >= 3.0 ? 8 : 0) +
    (hasResearch ? 5 : 0) + 20
  ));

  const practicality = Math.min(95, Math.max(25,
    (isCostConscious ? 30 : 10) +
    (wantsCloseToHome ? 15 : 0) +
    (hasInternships ? 10 : 0) +
    (isBusiness ? 5 : 0) +
    Math.round(avgFit * 0.3) + 5
  ));

  const adventureSpirit = Math.min(96, Math.max(20,
    (wantsFarFromHome ? 25 : 5) +
    (wantsBigCity ? 15 : 0) +
    (isLargeCampus ? 10 : 0) +
    (hasStudyAbroad ? 15 : 0) +
    (isSportsSpirit || hasGreekLife ? 10 : 0) +
    (!wantsCloseToHome ? 10 : 0) + 5
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
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const colleges = recommendations.colleges || [];
  const topNames = colleges.slice(0, 3).map((c) => c.name).join(", ");
  const shareText = `I got the '${personality.name}' college personality on Collegra 🎓\n\nMy top matches were ${colleges.length >= 3 ? `${colleges[0].name}, ${colleges[1].name}, and ${colleges[2].name}` : topNames}.\n\nTake the quiz and see your results:\nhttps://getcollegra.com`;

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "My Collegra College Personality", text: shareText, url: window.location.href }); } catch {}
    } else { await handleCopy(); }
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast({ title: "Copied!", description: "Your results have been copied to clipboard." });
      setTimeout(() => setCopied(false), 2500);
    } catch { toast({ title: "Could not copy", variant: "destructive" }); }
  };
  const handleDownload = () => {
    const lines = [
      `🎓 Collegra College Personality Results`, ``,
      firstName ? `Student: ${firstName}` : "", `Personality: ${personality.name}`, ``,
      `Top College Matches:`,
      ...colleges.slice(0, 5).map((c, i) => `  ${i + 1}. ${c.name} — ${c.fitScore}% fit (${c.fitCategory})`),
      ``, `Take the quiz: getcollegra.lovable.app`,
    ].filter(Boolean);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "collegra-results.txt"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Your results card has been saved." });
  };

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

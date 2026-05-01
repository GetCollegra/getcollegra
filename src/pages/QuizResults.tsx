import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  CheckCircle2, MapPin, DollarSign, GraduationCap, Users, Loader2,
  Star, ArrowRight, TrendingUp, Sparkles,
  BarChart3, Target, Shield, Zap, Award, BookOpen, Globe, Lock, ChevronDown,
  Heart, Bookmark
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CollegePersonality, { derivePersonality } from "@/components/quiz-results/CollegePersonality";
import HowYouCompare from "@/components/quiz-results/HowYouCompare";
import ShareResults from "@/components/quiz-results/ShareResults";
import PeerOutcomes from "@/components/PeerOutcomes";
import TrendingCollegeLists from "@/components/TrendingCollegeLists";

import { useAuth } from "@/contexts/AuthContext";
import { trackClick } from "@/lib/analytics";
import { capture } from "@/lib/posthog";
import { startCheckout } from "@/lib/checkout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { College, Recommendations } from "@/types/college";

const fitCategoryConfig: Record<string, { color: string; bg: string; border: string; icon: typeof Target; gradient: string }> = {
  Reach: { color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", icon: TrendingUp, gradient: "from-orange-500 to-amber-500" },
  Match: { color: "text-primary", bg: "bg-primary/5", border: "border-primary/20", icon: Target, gradient: "from-primary to-blue-500" },
  Safety: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: Shield, gradient: "from-emerald-500 to-teal-500" },
};

const loadingMessages = [
  "Analyzing your preferences...",
  "Searching 6,000+ institutions...",
  "Matching campus vibes...",
  "Comparing financial fit...",
  "Ranking your top picks...",
];

// Staggered fade-up for viewport
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const retryPreferenceAliases: Record<string, string[]> = {
  firstName: ["firstName", "first_name"],
  email: ["email"],
  cityState: ["cityState", "city_state"],
  gpa: ["gpa"],
  testScore: ["testScore", "test_score"],
  satScore: ["satScore", "sat_score"],
  actScore: ["actScore", "act_score"],
  campusSize: ["campusSize", "campus_size"],
  campusVibe: ["campusVibe", "campus_vibe"],
  locationType: ["locationType", "location_type"],
  maxCost: ["maxCost", "max_cost"],
  acceptanceRatePref: ["acceptanceRatePref", "acceptance_rate_pref"],
  financialAid: ["financialAid", "financial_aid"],
  campusLife: ["campusLife", "campus_life"],
  academicImportance: ["academicImportance", "academic_importance"],
  distanceFromHome: ["distanceFromHome", "distance_from_home"],
  weatherRegion: ["weatherRegion", "weather_region"],
  areaOfStudy: ["areaOfStudy", "area_of_study"],
};

const cleanPreference = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || /^\{.*\}$/.test(trimmed)) return fallback;
  return trimmed;
};

const buildRetryPreferences = (rawPrefs: unknown): Record<string, unknown> | null => {
  if (!rawPrefs || typeof rawPrefs !== "object" || Array.isArray(rawPrefs)) return null;
  const source = rawPrefs as Record<string, unknown>;

  const pick = (keys: string[]) => {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    return "";
  };

  const allResponses: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "string") continue;
    const cleaned = cleanPreference(value, "");
    if (cleaned) allResponses[key] = cleaned;
  }

  return {
    firstName: cleanPreference(pick(retryPreferenceAliases.firstName), ""),
    email: cleanPreference(pick(retryPreferenceAliases.email), ""),
    cityState: cleanPreference(pick(retryPreferenceAliases.cityState), "No preference"),
    gpa: cleanPreference(pick(retryPreferenceAliases.gpa), ""),
    testScore: cleanPreference(pick(retryPreferenceAliases.testScore), "None"),
    satScore: cleanPreference(pick(retryPreferenceAliases.satScore), ""),
    actScore: cleanPreference(pick(retryPreferenceAliases.actScore), ""),
    campusSize: cleanPreference(pick(retryPreferenceAliases.campusSize), "No preference"),
    campusVibe: cleanPreference(pick(retryPreferenceAliases.campusVibe), "No preference"),
    locationType: cleanPreference(pick(retryPreferenceAliases.locationType), "No preference"),
    maxCost: cleanPreference(pick(retryPreferenceAliases.maxCost), "No preference"),
    acceptanceRatePref: cleanPreference(pick(retryPreferenceAliases.acceptanceRatePref), "No preference"),
    financialAid: cleanPreference(pick(retryPreferenceAliases.financialAid), "Important"),
    campusLife: cleanPreference(pick(retryPreferenceAliases.campusLife), "No preference"),
    academicImportance: cleanPreference(pick(retryPreferenceAliases.academicImportance), "No preference"),
    distanceFromHome: cleanPreference(pick(retryPreferenceAliases.distanceFromHome), "No preference"),
    weatherRegion: cleanPreference(pick(retryPreferenceAliases.weatherRegion), "No preference"),
    areaOfStudy: cleanPreference(pick(retryPreferenceAliases.areaOfStudy), "Undecided"),
    allResponses,
  };
};

const LATEST_MATCH_ID_KEY = "latest_college_match_id";

const getStoredMatchId = () => {
  try {
    const stored = sessionStorage.getItem(LATEST_MATCH_ID_KEY)?.trim();
    return stored || null;
  } catch {
    return null;
  }
};

const setStoredMatchId = (matchId: string) => {
  try {
    sessionStorage.setItem(LATEST_MATCH_ID_KEY, matchId);
  } catch {
    // Ignore storage failures
  }
};

const LockedCollegeCard = ({ college, index, onUnlock }: { college: College; index: number; onUnlock: () => void }) => {
  const catConfig = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
  const CatIcon = catConfig.icon;

  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className="group relative"
    >
      <div className="relative bg-card border rounded-2xl lg:rounded-3xl overflow-hidden shadow-soft border-border">
        {/* Rank badge */}
        <div className={`absolute top-0 left-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${catConfig.gradient} flex items-end justify-end rounded-br-2xl z-10`}>
          <span className="text-white font-bold text-base sm:text-lg mr-2 mb-0.5 sm:mr-2.5 sm:mb-1">{index + 1}</span>
        </div>

        {/* Visible: name + basic info */}
        <div className="p-5 sm:p-6 md:p-8 pl-14 sm:pl-16 md:pl-20">
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1.5 leading-tight">{college.name}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs sm:text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {college.location}</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
                <span className="flex items-center gap-1"><Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {college.setting}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold ${catConfig.bg} ${catConfig.color} ${catConfig.border} border`}>
                <CatIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {college.fitCategory}
              </div>
            </div>
          </div>
        </div>

        {/* Blurred overlay */}
        <div className="relative">
          <div className="p-5 sm:p-6 md:p-8 pt-0 blur-[6px] opacity-40 select-none pointer-events-none" aria-hidden="true">
            <p className="text-foreground text-sm sm:text-base leading-relaxed mb-3">{college.whyFit}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded-xl h-16" />
              <div className="p-3 bg-muted/30 rounded-xl h-16" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent flex items-center justify-center">
            <div className="text-center px-4">
              <Lock className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-foreground text-sm font-semibold mb-1">Full match details locked</p>
              <p className="text-muted-foreground text-xs mb-3">See why this school fits you, stats, and insights</p>
              <Button
                size="sm"
                onClick={onUnlock}
                className="rounded-full px-5 gap-1.5 bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold"
              >
                Unlock All Matches <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CollegeCard = ({ college, index, onSave, isSaved }: { college: College; index: number; onSave?: (name: string) => void; isSaved?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const [challengesExpanded, setChallengesExpanded] = useState(false);
  const { toast } = useToast();
  const catConfig = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
  const CatIcon = catConfig.icon;

  const fitScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 75) return "text-primary";
    return "text-orange-500";
  };

  const fitScoreRing = (score: number) => {
    if (score >= 90) return "ring-emerald-500/20";
    if (score >= 75) return "ring-primary/20";
    return "ring-orange-500/20";
  };

  return (
    <motion.div
      custom={index}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      className="group"
    >
      <div className="relative bg-card border rounded-2xl lg:rounded-3xl overflow-hidden transition-all duration-300 shadow-soft border-border hover:shadow-card">
        {/* Rank badge */}
        <div className={`absolute top-0 left-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${catConfig.gradient} flex items-end justify-end rounded-br-2xl z-10`}>
          <span className="text-white font-bold text-base sm:text-lg mr-2 mb-0.5 sm:mr-2.5 sm:mb-1">{index + 1}</span>
        </div>

        {/* Card Header */}
        <div className="p-5 sm:p-6 md:p-8 pl-14 sm:pl-16 md:pl-20">
          {/* Title row */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1.5 leading-tight">{college.name}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs sm:text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {college.location}</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-border" />
                <span className="flex items-center gap-1"><Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> {college.setting}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold ${catConfig.bg} ${catConfig.color} ${catConfig.border} border`}>
                <CatIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {college.fitCategory}
              </div>
              <motion.div
                initial={{ scale: 0.8 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.08, type: "spring", stiffness: 300 }}
                className={`flex items-center gap-1 sm:gap-1.5 font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm bg-card border-2 border-border ring-4 ${fitScoreRing(college.fitScore)}`}
              >
                <Star className={`w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ${fitScoreColor(college.fitScore)}`} />
                <span className={fitScoreColor(college.fitScore)}>{college.fitScore}% fit</span>
              </motion.div>
            </div>
          </div>

          {/* Why Fit - personalized match reason */}
          <div className="flex items-start gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-primary/5 border border-primary/10 rounded-xl mb-3">
            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-foreground text-xs sm:text-sm"><span className="font-semibold">Why this fits you:</span> {college.whyFit}</p>
          </div>

          {/* Realism Note */}
          {college.realismNote && (
            <p className={`text-xs sm:text-sm font-medium mb-4 px-3 py-2 rounded-lg ${
              college.fitCategory === "Reach"
                ? "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                : college.fitCategory === "Safety"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "bg-primary/5 text-primary"
            }`}>
              {college.realismNote}
            </p>
          )}

          {/* Campus vibe + notable feature */}
          <div className="flex flex-col gap-2.5 sm:gap-3 mb-4">
            <div className="flex items-start gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-muted/40 rounded-xl">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <p className="text-foreground text-xs sm:text-sm"><span className="font-semibold">Vibe:</span> {college.campusVibe}</p>
            </div>
            <div className="flex items-start gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-primary/5 rounded-xl">
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-foreground text-xs sm:text-sm"><span className="font-semibold">Standout:</span> {college.notableFeature}</p>
            </div>
          </div>

          {/* Pros - expandable on mobile */}
          {Array.isArray(college.prosForStudent) && college.prosForStudent.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-primary text-xs sm:text-sm font-semibold mb-2 hover:underline sm:pointer-events-none sm:cursor-default"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Why it's great for you
                <ChevronDown className={`w-3.5 h-3.5 sm:hidden transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                <motion.ul
                  className={`space-y-1.5 overflow-hidden ${expanded ? "" : "hidden sm:block"}`}
                  initial={false}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  {college.prosForStudent.slice(0, 4).map((pro, pi) => (
                    <motion.li
                      key={pi}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: pi * 0.05 }}
                      className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{pro}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </AnimatePresence>
            </div>
          )}

          {/* Challenges & How to Get In */}
          {((Array.isArray(college.challengesForStudent) && college.challengesForStudent.length > 0) || college.howToGetIn) && (
            <div className="mb-2">
              <button
                onClick={() => setChallengesExpanded(!challengesExpanded)}
                className="flex items-center gap-1.5 text-orange-600 text-xs sm:text-sm font-semibold mb-2 hover:underline"
              >
                <Target className="w-3.5 h-3.5" />
                Challenges & How to Get In
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${challengesExpanded ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {challengesExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {Array.isArray(college.challengesForStudent) && college.challengesForStudent.length > 0 && (
                      <ul className="space-y-1.5 mb-3">
                        {college.challengesForStudent.map((challenge, ci) => (
                          <motion.li
                            key={ci}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: ci * 0.05 }}
                            className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                            <span>{challenge}</span>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                    {college.howToGetIn && (
                      <div className="flex items-start gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-accent/5 border border-accent/15 rounded-xl">
                        <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <p className="text-foreground text-xs sm:text-sm leading-relaxed">
                          <span className="font-semibold">How to get in:</span> {college.howToGetIn}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Save & Compare actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button
              size="sm"
              variant={isSaved ? "secondary" : "outline"}
              className="rounded-full px-4 gap-1.5 text-xs"
              onClick={() => onSave?.(college.name)}
            >
              {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
              {isSaved ? "Saved" : "Save School"}
            </Button>
            <Link to="/dashboard">
              <Button size="sm" variant="ghost" className="rounded-full px-4 gap-1.5 text-xs text-muted-foreground">
                <BarChart3 className="w-3.5 h-3.5" />
                Compare
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid - responsive */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
          {[
            { icon: GraduationCap, label: "Acceptance", value: college.acceptanceRate },
            { icon: DollarSign, label: "Annual Price", value: college.tuitionOutOfState },
            { icon: BarChart3, label: "Grad Rate", value: college.graduationRate },
            { icon: TrendingUp, label: "Avg Salary", value: college.avgStartingSalary },
          ].filter(stat => stat.value && stat.value !== "N/A" && stat.value !== "Premium" && stat.value !== "Not reported").map((stat, si, arr) => (
            <div
              key={stat.label}
              className={`p-3 sm:p-4 md:p-5 ${si < arr.length - 1 ? "border-r border-border" : ""} ${si < 2 ? "border-b md:border-b-0 border-border" : ""}`}
            >
              <div className="flex items-center gap-1 text-muted-foreground text-[10px] sm:text-xs mb-1">
                <stat.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {stat.label}
              </div>
              <p className="font-bold text-foreground text-sm sm:text-base md:text-lg">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Premium Paywall */}
        <div className="relative border-t border-border overflow-hidden">
          <div className="p-5 sm:p-6 md:p-8 select-none pointer-events-none" aria-hidden="true">
            <div className="blur-[3px] opacity-60">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
                {[
                  { label: "Tuition (In-State)", value: college.tuitionInState },
                  { label: "Tuition (Out-of-State)", value: college.tuitionOutOfState },
                  { label: "Avg Financial Aid", value: college.avgFinancialAid },
                  { label: "Student:Faculty", value: college.studentFacultyRatio },
                  { label: "Student Body", value: college.studentBody },
                  { label: "Campus Size", value: college.campusSize },
                ].map((item) => (
                  <div key={item.label} className="p-3 sm:p-4 bg-muted/30 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{item.label}</p>
                    <p className="font-semibold text-foreground text-sm sm:text-base">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                <div className="p-4 sm:p-5 bg-muted/20 rounded-xl h-20 sm:h-28" />
                <div className="p-4 sm:p-5 bg-muted/20 rounded-xl h-20 sm:h-28" />
              </div>
            </div>
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card from-30% via-card/70 to-card/30 flex items-center justify-center p-4 sm:p-6">
            <div className="text-center max-w-sm">
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 mb-4 sm:mb-5 shadow-soft"
              >
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </motion.div>
              <h4 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                Unlock your full college plan
              </h4>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">
                With Collegra™ Premium you get:
              </p>
              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2.5 text-xs sm:text-sm text-foreground mx-auto max-w-xs mb-5 sm:mb-7">
                <div className="flex items-center gap-1.5 sm:gap-2 text-left">🎓 <span>15+ matches</span></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-left">📊 <span>Acceptance odds</span></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-left">💰 <span>Tuition & aid</span></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-left">📝 <span>Organizer</span></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-left">⭐ <span>Save & notes</span></div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-left">📍 <span>Side-by-side</span></div>
              </div>
              <button
                onClick={() => { trackClick("Unlock Premium Breakdown", "QuizResults"); startCheckout(toast); }}
                className="block w-full"
              >
                <Button
                  size="lg"
                  className="rounded-full px-6 sm:px-8 gap-2 sm:gap-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold shadow-elevated hover:shadow-card hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 w-full text-sm sm:text-base"
                  asChild
                >
                  <span>
                  Unlock Full Results – $9.99/mo
                  <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </span>
                </Button>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const QuizResults = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [additionalColleges, setAdditionalColleges] = useState<College[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [dbSurveyContext, setDbSurveyContext] = useState<Record<string, string>>({});
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const aiEnhancementTriggered = useRef(false);
  const [savedColleges, setSavedColleges] = useState<Set<string>>(new Set());
  const [retryNonce, setRetryNonce] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading, isSubscribed } = useAuth();

  // Fire results_viewed when recommendations load
  useEffect(() => {
    if (recommendations) capture("results_viewed", { collegeCount: recommendations.colleges?.length });
  }, [recommendations]);

  // Read results passed via router state from Survey page
  const routerState = location.state as { recommendations?: Recommendations; surveyContext?: Record<string, string> } | null;

  const persistedSurveyContext = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("latest_survey_preferences");
      if (!raw) return {} as Record<string, string>;

      const parsed = JSON.parse(raw) as {
        responses?: Record<string, unknown>;
        savedAt?: number;
      };

      if (!parsed?.responses || typeof parsed.responses !== "object") {
        return {} as Record<string, string>;
      }

      // Keep only recent submissions to avoid stale fallbacks
      if (typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt > 1000 * 60 * 30) {
        return {} as Record<string, string>;
      }

      const context: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed.responses)) {
        if (typeof value !== "string") continue;
        const trimmed = value.trim();
        if (!trimmed || /^\{.*\}$/.test(trimmed)) continue;
        context[key] = trimmed;
      }

      return context;
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  const requestedMatchId = useMemo(() => {
    const matchIdFromUrl = searchParams.get("match_id");
    return matchIdFromUrl || getStoredMatchId();
  }, [searchParams]);

  const surveyContext = useMemo(() => {
    // Priority 1: DB context from match record
    if (Object.keys(dbSurveyContext).length > 0) return dbSurveyContext;

    // Priority 2: Router state survey context
    if (routerState?.surveyContext && Object.keys(routerState.surveyContext).length > 0) {
      return routerState.surveyContext;
    }

    // Priority 3: URL params
    const context: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key === "__lovable_token" || key === "submission_id" || key === "match_id" || key.startsWith("__")) return;
      if (value.trim()) context[key] = value;
    });

    if (Object.keys(context).length > 0) return context;

    // Priority 4: Session storage fallback
    return persistedSurveyContext;
  }, [dbSurveyContext, routerState, searchParams, persistedSurveyContext]);

  const recommendedCollegeNames = useMemo(
    () => recommendations?.colleges?.map((college) => college.name) ?? [],
    [recommendations]
  );

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  // Track elapsed seconds while loading so we can show "still working" reassurance
  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // Helper to extract survey context from raw_preferences
  const extractSurveyContext = (rawPrefs: unknown) => {
    if (rawPrefs && typeof rawPrefs === "object" && !Array.isArray(rawPrefs)) {
      const ctx: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawPrefs as Record<string, unknown>)) {
        if (typeof v === "string") ctx[k] = v;
      }
      if (Object.keys(ctx).length > 0) setDbSurveyContext(ctx);
    }
  };

  // Helper to build Recommendations from a DB row
  const buildRecommendations = (match: any): Recommendations | null => {
    const colleges = Array.isArray(match.college_data) ? match.college_data : [];
    if (colleges.length === 0) return null;

    const profile = match.student_profile && typeof match.student_profile === "object"
      ? match.student_profile
      : { summary: "", topPriorities: [], idealSchoolType: "" };

    return {
      colleges: colleges as any,
      studentProfile: {
        summary: profile.summary || "",
        topPriorities: profile.topPriorities || [],
        idealSchoolType: profile.idealSchoolType || "",
      },
      comparisonInsight: match.comparison_insight || "",
    };
  };

  // Trigger AI enhancement for rule-based results (version 1)
  const triggerAIEnhancement = async (mId: string, recs: Recommendations, rawPrefs: unknown) => {
    // Prevent duplicate AI requests across renders/refreshes
    if (aiEnhancementTriggered.current) return;
    aiEnhancementTriggered.current = true;

    try {
      const retryPrefs = buildRetryPreferences(rawPrefs);
      if (!retryPrefs || !recs.colleges || recs.colleges.length < 3) return;

      console.log("[QuizResults] Triggering AI enhancement for match:", mId);
      setAiEnhancing(true);
      const { data, error: fnErr } = await supabase.functions.invoke("enhance-college-explanations", {
        body: { matchId: mId, preferences: retryPrefs, colleges: recs.colleges },
      });

      if (fnErr || !data?.enhanced) {
        console.warn("[QuizResults] AI enhancement failed:", fnErr || data?.error);
        return;
      }
      if (data.alreadyDone) return;

      console.log("[QuizResults] AI enhancement succeeded, updating UI");
      setRecommendations({
        colleges: data.colleges as College[],
        studentProfile: data.studentProfile || recs.studentProfile,
        comparisonInsight: data.comparisonInsight || recs.comparisonInsight,
      });
    } catch (err) {
      console.warn("[QuizResults] AI enhancement error:", err);
    } finally {
      setAiEnhancing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    // ── Priority 1: Legacy router state ──
    if (!requestedMatchId && routerState?.recommendations) {
      setRecommendations(routerState.recommendations);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let pollCount = 0;
    let recoveryTriggered = false;
    let activeMatchId = requestedMatchId;
    const MAX_POLLS = 90;

    const scheduleRetry = (delayMs: number) => {
      if (!cancelled) {
        setTimeout(loadResults, delayMs);
      }
    };

    const getRecoveryPreferences = async () => {
      const fromContext = buildRetryPreferences(surveyContext);
      if (fromContext) return fromContext;

      if (!user) return null;

      const { data: latestAnswers, error } = await supabase
        .from("quiz_answers")
        .select("answers, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[QuizResults] Failed to load quiz answers for recovery:", error);
        return null;
      }

      const latest = latestAnswers?.[0] as { answers?: unknown } | undefined;
      return latest ? buildRetryPreferences(latest.answers) : null;
    };

    const ensureMatchExists = async () => {
      if (!user) return null;

      const recoveryPreferences = await getRecoveryPreferences();
      if (!recoveryPreferences) return null;

      const { data: latestMatches, error: latestMatchesError } = await supabase
        .from("college_matches")
        .select("id, ai_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestMatchesError) {
        console.error("[QuizResults] Failed to check latest match for recovery:", latestMatchesError);
      }

      const latestMatch = latestMatches?.[0] as { id: string; ai_status?: string; created_at?: string } | undefined;
      const latestAgeMs = latestMatch?.created_at
        ? Date.now() - Date.parse(String(latestMatch.created_at))
        : Number.POSITIVE_INFINITY;

      if (latestMatch && latestAgeMs < 1000 * 60 * 30) {
        setStoredMatchId(latestMatch.id);

        if ((latestMatch.ai_status === "pending" || latestMatch.ai_status === "processing") && !recoveryTriggered) {
          recoveryTriggered = true;
          supabase.functions.invoke("college-match", {
            body: { preferences: recoveryPreferences, matchId: latestMatch.id },
          }).catch((err) => console.error("[QuizResults] Recovery invoke failed:", err));
        }

        return latestMatch.id;
      }

      const rawPreferences = (() => {
        const allResponses = recoveryPreferences.allResponses;
        if (allResponses && typeof allResponses === "object" && !Array.isArray(allResponses)) {
          return allResponses;
        }

        return Object.fromEntries(
          Object.entries(recoveryPreferences).filter(
            ([key, value]) => key !== "allResponses" && typeof value === "string" && value.trim()
          )
        );
      })();

      const { data: createdMatch, error: createError } = await supabase
        .from("college_matches")
        .insert({
          user_id: user.id,
          raw_preferences: rawPreferences,
          ai_status: "pending",
          college_data: [],
          student_profile: {},
        } as any)
        .select("id")
        .maybeSingle();

      if (createError || !createdMatch?.id) {
        console.error("[QuizResults] Failed to create recovery match:", createError);
        return null;
      }

      setStoredMatchId(createdMatch.id);
      supabase.functions.invoke("college-match", {
        body: { preferences: recoveryPreferences, matchId: createdMatch.id },
      }).catch((err) => console.error("[QuizResults] Recovery invoke failed:", err));

      return createdMatch.id;
    };

    const loadResults = async () => {
      try {
        if (!activeMatchId) {
          if (!user) {
            setError("Please log in to view your results.");
            setLoading(false);
            return;
          }

          const { data: latestMatches, error: latestError } = await supabase
            .from("college_matches")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (latestError) throw latestError;

          if (latestMatches && latestMatches.length > 0) {
            activeMatchId = (latestMatches[0] as any).id;
            setStoredMatchId(activeMatchId);
            scheduleRetry(0);
            return;
          }

          const recoveredMatchId = await ensureMatchExists();
          if (recoveredMatchId) {
            activeMatchId = recoveredMatchId;
            pollCount = 0;
            scheduleRetry(1000);
            return;
          }

          setError("No quiz submission was found yet. Please go back and submit the quiz.");
          setLoading(false);
          return;
        }

        if (!user) {
          setError("Please log in to view your results.");
          setLoading(false);
          return;
        }

        const { data: match, error: fetchErr } = await supabase
          .from("college_matches")
          .select("*")
          .eq("id", activeMatchId)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!match) {
          pollCount++;

          if (pollCount <= 10) {
            scheduleRetry(1500);
            return;
          }

          const recoveredMatchId = await ensureMatchExists();
          if (recoveredMatchId && recoveredMatchId !== activeMatchId) {
            activeMatchId = recoveredMatchId;
            pollCount = 0;
            scheduleRetry(1000);
            return;
          }

          setError("We couldn't find your results yet. Please stay on this page while we finish processing your quiz.");
          setLoading(false);
          return;
        }

        setStoredMatchId(match.id);
        extractSurveyContext((match as any).raw_preferences);

        const status = (match as any).ai_status || "completed";
        const version = (match as any).results_version || 1;

        if (status === "completed" || status === "failed") {
          const recs = buildRecommendations(match);

          if (!recs) {
            const retryPreferences = buildRetryPreferences((match as any).raw_preferences) || await getRecoveryPreferences();
            if (retryPreferences && !recoveryTriggered) {
              recoveryTriggered = true;
              supabase.functions.invoke("college-match", {
                body: { preferences: retryPreferences, matchId: match.id },
              }).catch((err) => console.error("[QuizResults] Recovery failed:", err));
              pollCount++;
              scheduleRetry(pollCount < 10 ? 2000 : 3000);
              return;
            }

            setError(status === "failed"
              ? `Results generation encountered an issue: ${(match as any).ai_error || "Unknown error"}. Please try again.`
              : "No results were generated yet. Please stay on this page while we retry your quiz.");
          } else {
            setRecommendations(recs);
            if (version < 2 && !cancelled) {
              triggerAIEnhancement(match.id, recs, (match as any).raw_preferences);
            }
          }

          setLoading(false);
          return;
        }

        const createdAt = Date.parse(String((match as any).created_at || ""));
        const ageMs = Number.isFinite(createdAt) ? Date.now() - createdAt : 0;

        if (!recoveryTriggered && ((status === "pending" && ageMs > 8000) || (status === "processing" && ageMs > 20000))) {
          const retryPreferences = buildRetryPreferences((match as any).raw_preferences) || await getRecoveryPreferences();
          if (retryPreferences) {
            recoveryTriggered = true;
            supabase.functions.invoke("college-match", {
              body: { preferences: retryPreferences, matchId: match.id },
            }).catch((err) => console.error("[QuizResults] Recovery failed:", err));
          }
        }

        pollCount++;
        if (pollCount >= MAX_POLLS) {
          const recoveredMatchId = await ensureMatchExists();
          if (recoveredMatchId && recoveredMatchId !== activeMatchId) {
            activeMatchId = recoveredMatchId;
            pollCount = 0;
            scheduleRetry(1000);
            return;
          }

          setError("Results are taking longer than expected. Please refresh the page or try the quiz again.");
          setLoading(false);
          return;
        }

        scheduleRetry(pollCount < 10 ? 2000 : 3000);
      } catch (err) {
        console.error("[QuizResults] Failed while loading results:", err);
        pollCount++;

        if (pollCount < 5) {
          scheduleRetry(1500);
          return;
        }

        setError("Failed to load results. Please refresh and try again.");
        setLoading(false);
      }
    };

    loadResults();
    return () => {
      cancelled = true;
    };
  }, [authLoading, requestedMatchId, routerState, surveyContext, user, retryNonce]);

  // Retry AI matching without a full page reload
  const handleRetryMatch = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);

    try {
      capture("results_retry_clicked", { elapsedSec });
      trackClick("results_retry_match", "QuizResults");

      const retryPrefs = buildRetryPreferences(surveyContext);
      const storedId = getStoredMatchId();

      // Reset UI state so the loading screen takes over
      aiEnhancementTriggered.current = false;
      setRecommendations(null);
      setAdditionalColleges([]);
      setError(null);
      setLoading(true);

      // Best-effort: mark existing match as pending and re-invoke the function
      if (user && storedId && retryPrefs) {
        await supabase
          .from("college_matches")
          .update({ ai_status: "pending", ai_error: null } as any)
          .eq("id", storedId)
          .eq("user_id", user.id);

        supabase.functions
          .invoke("college-match", { body: { preferences: retryPrefs, matchId: storedId } })
          .catch((err) => console.error("[QuizResults] Retry invoke failed:", err));
      }

      // Bump nonce to re-run the load effect (handles polling + recovery)
      setRetryNonce((n) => n + 1);
    } catch (err) {
      console.error("[QuizResults] Retry failed:", err);
      toast({
        title: "Retry failed",
        description: "We couldn't restart matching. Please refresh the page.",
        variant: "destructive",
      });
      setLoading(false);
    } finally {
      setRetrying(false);
    }
  }, [retrying, elapsedSec, surveyContext, user, toast]);

  // Load saved colleges on mount
  useEffect(() => {
    if (!user) return;
    supabase.from("saved_colleges").select("college_name").eq("user_id", user.id).then(({ data }) => {
      if (data) setSavedColleges(new Set(data.map((r: any) => r.college_name)));
    });
  }, [user]);

  const handleSaveCollege = useCallback(async (collegeName: string) => {
    if (!user) {
      toast({ title: "Sign in to save schools", description: "Create an account to save and compare colleges." });
      return;
    }
    const college = recommendations?.colleges?.find(c => c.name === collegeName)
      || additionalColleges.find(c => c.name === collegeName);
    if (!college) return;

    if (savedColleges.has(collegeName)) {
      // Already saved
      toast({ title: "Already saved", description: `${collegeName} is in your dashboard.` });
      return;
    }

    const { error: saveErr } = await supabase.from("saved_colleges").insert({
      user_id: user.id,
      college_name: collegeName,
      college_data: college as any,
      status: "Considering",
    });

    if (!saveErr) {
      setSavedColleges(prev => new Set(prev).add(collegeName));
      toast({ title: "School saved! ✨", description: `${collegeName} added to your dashboard.` });
      capture("college_saved_from_results", { college: collegeName });
    }
  }, [user, recommendations, additionalColleges, savedColleges, toast]);

  // Derive personalization summary from survey context
  const personalizationSummary = useMemo(() => {
    const parts: string[] = [];
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = surveyContext[k];
        if (v && v.trim() && !["no preference", "undecided", "none"].includes(v.trim().toLowerCase())) return v.trim();
      }
      return "";
    };
    const major = pick("areaOfStudy", "area_of_study");
    const size = pick("campusSize", "campus_size");
    const cost = pick("maxCost", "max_cost");
    const location = pick("locationType", "location_type");
    if (major) parts.push(major);
    if (size) parts.push(size.toLowerCase() + " campus");
    if (cost) parts.push(cost + " budget");
    if (location) parts.push(location.toLowerCase() + " setting");
    return parts.length > 0 ? parts.join(", ") : "";
  }, [surveyContext]);

  // Progress calculation
  const progressPercent = useMemo(() => {
    let progress = 30; // Base: took quiz
    if (recommendations) progress += 20; // Got results
    if (savedColleges.size > 0) progress += 20; // Saved at least one
    if (savedColleges.size >= 3) progress += 10; // Saved multiple
    // Max without premium is ~80%
    return Math.min(progress, 80);
  }, [recommendations, savedColleges]);

  const allCollegeNames = useMemo(() => {
    const names = recommendations?.colleges?.map(c => c.name) ?? [];
    return [...names, ...additionalColleges.map(c => c.name)];
  }, [recommendations, additionalColleges]);

  const discoverMore = async () => {
    if (!recommendations || loadingMore) return;
    setLoadingMore(true);

    // Rebuild preferences from survey context
    const pickParam = (...keys: string[]) => {
      for (const key of keys) {
        const value = surveyContext[key];
        if (typeof value === "string" && value.trim()) return value;
      }
      return "";
    };
    const clean = (val: string | undefined, fallback: string): string => {
      if (!val) return fallback;
      const trimmed = val.trim();
      if (!trimmed || /^\{.*\}$/.test(trimmed)) return fallback;
      return trimmed;
    };

    const preferences = {
      firstName: pickParam("first_name", "firstName"),
      email: pickParam("email"),
      cityState: clean(pickParam("city_state", "cityState"), "No preference"),
      gpa: clean(pickParam("gpa"), ""),
      testScore: clean(pickParam("test_score", "testScore"), "None"),
      satScore: clean(pickParam("sat_score", "satScore"), ""),
      actScore: clean(pickParam("act_score", "actScore"), ""),
      campusSize: clean(pickParam("campus_size", "campusSize"), "No preference"),
      campusVibe: clean(pickParam("campus_vibe", "campusVibe"), "No preference"),
      locationType: clean(pickParam("location_type", "locationType"), "No preference"),
      maxCost: clean(pickParam("max_cost", "maxCost"), "No preference"),
      acceptanceRatePref: clean(pickParam("acceptance_rate_pref", "acceptanceRatePref"), "No preference"),
      financialAid: clean(pickParam("financial_aid", "financialAid"), "Important"),
      campusLife: clean(pickParam("campus_life", "campusLife"), "No preference"),
      academicImportance: clean(pickParam("academic_importance", "academicImportance"), "No preference"),
      distanceFromHome: clean(pickParam("distance_from_home", "distanceFromHome"), "No preference"),
      areaOfStudy: clean(pickParam("area_of_study", "areaOfStudy"), "Undecided"),
      allResponses: surveyContext,
    };

    try {
      const { data, error: fnError } = await supabase.functions.invoke("college-match", {
        body: { preferences, excludeColleges: allCollegeNames },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.colleges) {
        setAdditionalColleges(prev => [...prev, ...data.colleges]);
        toast({ title: "Found more matches!", description: `${data.colleges.length} additional colleges discovered.` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load more recommendations";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  };

  const fitScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 75) return "text-primary";
    return "text-orange-500";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-14 sm:pt-28 sm:pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(210_90%_70%/0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(210_80%_30%/0.4),transparent_60%)]" />
        <div className="absolute top-10 right-10 w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-10 sm:left-20 w-60 sm:w-96 h-60 sm:h-96 rounded-full bg-white/5 blur-3xl" />

        <div className="container px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 3 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 12 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 sm:mb-8"
            >
              <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </motion.div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-5 leading-tight">
              {surveyContext.first_name || surveyContext.firstName
                ? `${surveyContext.first_name || surveyContext.firstName}, Your College Matches`
                : "Your College Matches"}
              <br />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/70 text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              >
                are ready
              </motion.span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/75 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-2"
            >
              We analyzed your unique preferences against real U.S. Department of Education data to find schools that truly fit you.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">
        {/* Loading State */}
        {loading && (
          <section className="py-20 sm:py-32">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 sm:gap-6 px-4">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-3 rounded-full border-4 border-accent/30 border-b-transparent"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="font-display text-2xl sm:text-3xl font-bold text-primary tabular-nums leading-none"
                    aria-live="polite"
                    aria-label={`${elapsedSec} seconds elapsed`}
                  >
                    {elapsedSec}s
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">elapsed</span>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMsgIndex}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="text-foreground text-base sm:text-lg font-semibold text-center"
                >
                  {loadingMessages[loadingMsgIndex]}
                </motion.p>
              </AnimatePresence>
              {/* Progress bar — fills toward ~25s target, then hovers near 95% */}
              <div className="w-full max-w-xs h-2 rounded-full bg-border/60 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(95, Math.round((elapsedSec / 25) * 100))}>
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-accent"
                  initial={false}
                  animate={{ width: `${Math.min(95, Math.round((elapsedSec / 25) * 100))}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <div className="flex gap-1.5">
                {loadingMessages.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: i === loadingMsgIndex ? 1.3 : 1 }}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === loadingMsgIndex ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm text-center max-w-md px-4">
                Most matches finish in under 25 seconds.
              </p>
              {elapsedSec >= 20 && elapsedSec < 40 && (
                <p className="text-muted-foreground text-xs sm:text-sm text-center max-w-md px-4">
                  Almost there — finalizing your top picks ({elapsedSec}s)
                </p>
              )}
              {elapsedSec >= 40 && elapsedSec < 70 && (
                <p className="text-foreground/80 text-xs sm:text-sm text-center max-w-md px-4">
                  Still working… please keep this page open ({elapsedSec}s)
                </p>
              )}
              {elapsedSec >= 70 && (
                <div className="text-center max-w-md px-4 mt-2">
                  <p className="text-foreground text-sm font-medium mb-3">
                    This is taking longer than expected.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="rounded-full"
                  >
                    Refresh page
                  </Button>
                </div>
              )}
            </motion.div>
          </section>
        )}

        {/* Error */}
        {error && !loading && (
          <section className="py-20 sm:py-28 text-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-destructive text-2xl">!</span>
              </div>
              <p className="text-foreground font-semibold text-lg mb-2">Something went wrong</p>
              <p className="text-muted-foreground mb-6 text-sm sm:text-base">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
                <Button
                  onClick={handleRetryMatch}
                  disabled={retrying}
                  className="rounded-full px-6 bg-gradient-to-r from-primary to-accent text-white min-h-[44px]"
                >
                  {retrying ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Retrying…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Retry AI match</>
                  )}
                </Button>
                <Button
                  onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
                  variant="outline"
                  className="rounded-full px-6 min-h-[44px]"
                >
                  Refresh page
                </Button>
                <Link to="/survey" className="contents">
                  <Button variant="ghost" className="rounded-full px-6 min-h-[44px]">Retake Quiz</Button>
                </Link>
              </div>
            </motion.div>
          </section>
        )}

        {recommendations && !loading && (
          <>
            {/* College Personality Hero Card */}
            <CollegePersonality
              surveyContext={surveyContext}
              recommendations={recommendations}
              firstName={surveyContext.first_name || surveyContext.firstName}
            />

            {/* Student Profile Section */}
            <section className="py-12 sm:py-16 md:py-24 bg-gradient-subtle">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="text-center mb-8 sm:mb-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4"
                    >
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </motion.div>
                    <p className="text-primary font-semibold text-xs sm:text-sm uppercase tracking-widest mb-2">Your Profile</p>
                    <h2 className="font-display text-xl sm:text-2xl md:text-4xl font-bold text-foreground">
                      What we learned about you
                    </h2>
                  </div>

                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl sm:rounded-3xl blur-lg opacity-50" />
                    <div className="relative bg-card border border-border rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-10 shadow-soft">
                      <p className="text-foreground text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">{recommendations.studentProfile.summary}</p>
                      <div className="flex flex-wrap gap-2 sm:gap-3 mb-5 sm:mb-6">
                        {recommendations.studentProfile.topPriorities.map((p, i) => (
                          <motion.span
                            key={p}
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 + i * 0.08, type: "spring" }}
                            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold border border-primary/15"
                          >
                            {p}
                          </motion.span>
                        ))}
                      </div>
                      <div className="flex items-start gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 bg-muted/50 rounded-lg sm:rounded-xl">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-muted-foreground text-xs sm:text-sm italic leading-relaxed">{recommendations.studentProfile.idealSchoolType}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Progress Indicator */}
            <div className="container px-4 py-4 sm:py-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-5xl mx-auto"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-muted-foreground font-medium">Your college plan progress</span>
                  <span className="text-primary font-bold">{progressPercent}% complete</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${progressPercent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  />
                </div>
                <p className="text-muted-foreground text-[10px] sm:text-xs mt-1.5">
                  {savedColleges.size === 0 ? "Save your top schools to continue building your plan" : 
                   savedColleges.size < 3 ? "Save a few more schools to unlock deeper comparisons" :
                   "Unlock Premium to complete your full college plan"}
                </p>
              </motion.div>
            </div>

            {/* College Matches Section */}
            <section className="py-12 sm:py-16 md:py-24 bg-background">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-10 sm:mb-16"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-semibold mb-3 sm:mb-4"
                  >
                    <Award className="w-4 h-4" />
                    Top {recommendations.colleges.length} Matches
                  </motion.div>
                  <h2 className="font-display text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
                    Colleges picked for <span className="text-gradient">you</span>
                  </h2>

                  {/* Personalization Summary */}
                  {personalizationSummary && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 }}
                      className="text-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2 mb-2"
                    >
                      Based on your preferences for <span className="font-semibold text-primary">{personalizationSummary}</span>, these are your best matches.
                    </motion.p>
                  )}

                  <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto px-2">
                    Each school is scored based on how well it aligns with your unique goals, budget, and preferences.
                  </p>
                </motion.div>

                {/* AI Enhancement Banner */}
                <AnimatePresence>
                  {aiEnhancing && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="max-w-5xl mx-auto mb-6"
                    >
                      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-primary/5 border border-primary/15">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        </motion.div>
                        <p className="text-foreground text-xs sm:text-sm font-medium">
                          Personalizing your insights with AI…
                          <span className="text-muted-foreground font-normal ml-1">Explanations will update momentarily.</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                  {/* Top 3 fully visible */}
                  {recommendations.colleges.slice(0, 3).map((college, i) => (
                    <CollegeCard key={college.name} college={college} index={i} onSave={handleSaveCollege} isSaved={savedColleges.has(college.name)} />
                  ))}

                  {/* Locked cards for colleges 4+ */}
                  {recommendations.colleges.length > 3 && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center py-4"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-semibold">
                          <Lock className="w-3.5 h-3.5" />
                          +{recommendations.colleges.length - 3} more personalized matches waiting
                        </div>
                      </motion.div>

                      {recommendations.colleges.slice(3).map((college, i) => (
                        <LockedCollegeCard
                          key={college.name}
                          college={college}
                          index={i + 3}
                          onUnlock={() => { trackClick("Unlock Locked Card", "QuizResults"); startCheckout(toast); }}
                        />
                      ))}
                    </>
                  )}

                  {/* Additional discovered colleges */}
                  {additionalColleges.length > 0 && (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center pt-8 sm:pt-12 pb-4"
                      >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-semibold mb-2">
                          <Sparkles className="w-4 h-4" />
                          More Matches
                        </div>
                        <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                          Additional colleges for you
                        </h3>
                      </motion.div>
                      {additionalColleges.map((college, i) => (
                        <CollegeCard key={college.name} college={college} index={i + recommendations.colleges.length} onSave={handleSaveCollege} isSaved={savedColleges.has(college.name)} />
                      ))}
                    </>
                  )}

                </div>
              </div>
            </section>

            {/* Students Like You Got Into — peer outcomes (AI-generated trends) */}
            <PeerOutcomes
              profile={{
                gpa: surveyContext.gpa,
                state: surveyContext.cityState || surveyContext.city_state,
                major: surveyContext.areaOfStudy || surveyContext.area_of_study,
                testScore: surveyContext.testScore || surveyContext.test_score,
                campusSize: surveyContext.campusSize || surveyContext.campus_size,
                locationType: surveyContext.locationType || surveyContext.location_type,
                academicImportance: surveyContext.academicImportance || surveyContext.academic_importance,
                idealSchoolType: recommendations?.studentProfile?.idealSchoolType,
                topPriorities: recommendations?.studentProfile?.topPriorities,
              }}
            />

            {/* Trending College Lists — browseable curated collections */}
            <TrendingCollegeLists />

            {/* Comparison Table Section */}
            <section className="py-12 sm:py-16 md:py-24 bg-muted/20">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-8 sm:mb-12"
                >
                  <p className="text-primary font-semibold text-xs sm:text-sm uppercase tracking-widest mb-2">Side-by-Side</p>
                  <h2 className="font-display text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
                    Compare at a glance
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base">Swipe or scroll to see all schools</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-6xl mx-auto"
                >
                  <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-border shadow-soft bg-card -mx-4 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b-2 border-border bg-muted/30">
                          <th className="text-left p-3 sm:p-4 md:p-5 text-muted-foreground font-semibold min-w-[110px] sm:min-w-[140px] sticky left-0 bg-muted/30 z-10">Factor</th>
                          {recommendations.colleges.map((c) => (
                            <th key={c.name} className="text-center p-3 sm:p-4 md:p-5 text-foreground font-semibold min-w-[130px] sm:min-w-[160px]">
                              <div className="text-xs sm:text-sm leading-tight">{c.name}</div>
                              <div className="flex items-center justify-center gap-1 mt-1 sm:mt-1.5">
                                <Star className={`w-3 h-3 fill-current ${fitScoreColor(c.fitScore)}`} />
                                <span className={`text-[10px] sm:text-xs font-bold ${fitScoreColor(c.fitScore)}`}>{c.fitScore}%</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Category", key: "fitCategory" },
                          { label: "Acceptance Rate", key: "acceptanceRate" },
                          { label: "Annual Price", key: "tuitionOutOfState" },
                          { label: "Graduation Rate", key: "graduationRate" },
                          { label: "Avg Starting Salary", key: "avgStartingSalary" },
                          { label: "Student Body", key: "studentBody" },
                          { label: "Setting", key: "setting" },
                          { label: "Student:Faculty", key: "studentFacultyRatio" },
                        ].map((row, ri) => {
                          const isPremiumRow = ["graduationRate", "avgStartingSalary", "studentBody", "studentFacultyRatio"].includes(row.key);
                          return (
                          <tr key={row.key} className={`border-b border-border last:border-b-0 ${ri % 2 === 0 ? "bg-muted/10" : ""}`}>
                            <td className="p-3 sm:p-4 md:p-5 text-muted-foreground font-medium sticky left-0 bg-card z-10 text-xs sm:text-sm">{row.label}</td>
                            {recommendations.colleges.map((c) => (
                              <td key={c.name} className="p-3 sm:p-4 md:p-5 text-center text-foreground">
                                {isPremiumRow && (c[row.key as keyof College] as string) === "Premium" ? (
                                  <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                                    <Lock className="w-3 h-3" /> Premium
                                  </span>
                                ) : row.key === "fitCategory" ? (
                                  <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold ${(fitCategoryConfig[c.fitCategory] || fitCategoryConfig.Match).bg} ${(fitCategoryConfig[c.fitCategory] || fitCategoryConfig.Match).color}`}>
                                    {c[row.key as keyof College] as string}
                                  </span>
                                ) : (
                                  <span className="font-medium text-xs sm:text-sm">{c[row.key as keyof College] as string}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* How You Compare Leaderboard */}
            <HowYouCompare
              surveyContext={surveyContext}
              recommendations={recommendations}
              firstName={surveyContext.first_name || surveyContext.firstName}
            />


            {/* AI Insight Section */}
            <section className="py-12 sm:py-16 md:py-24 bg-background">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-3xl mx-auto text-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="relative inline-block mb-6 sm:mb-8"
                  >
                    <div className="absolute -inset-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl" />
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                  </motion.div>
                  <h2 className="font-display text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-6 sm:mb-8">
                    {surveyContext.first_name || surveyContext.firstName
                      ? `${surveyContext.first_name || surveyContext.firstName}, Here's Our Expert Take`
                      : "Our Expert Take"}
                  </h2>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl sm:rounded-3xl blur-lg" />
                    <div className="relative bg-card border border-border rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 shadow-soft">
                      <p className="text-foreground text-base sm:text-lg leading-relaxed italic">
                        "{recommendations.comparisonInsight}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>


            {/* Next Steps Prompt */}
            <section className="py-10 sm:py-14 bg-muted/10">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-2xl mx-auto"
                >
                  <h3 className="font-display text-lg sm:text-xl font-bold text-foreground text-center mb-5">
                    What should you do next?
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Bookmark className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-semibold">Save top schools</p>
                        <p className="text-muted-foreground text-xs">Build your shortlist</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-semibold">Compare favorites</p>
                        <p className="text-muted-foreground text-xs">See them side-by-side</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-semibold">Unlock full plan</p>
                        <p className="text-muted-foreground text-xs">Get complete insights</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            <section className="relative py-16 sm:py-20 md:py-28 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-hero" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(210_90%_70%/0.25),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(210_80%_30%/0.3),transparent_50%)]" />
              <div className="container px-4 relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center max-w-2xl mx-auto"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring" }}
                    className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-5 sm:mb-6"
                  >
                    <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </motion.div>
                  <h2 className="font-display text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
                    Unlock your full college plan
                  </h2>
                  <p className="text-white/75 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 leading-relaxed max-w-lg mx-auto px-2">
                    Get 15+ matches, acceptance estimates, financial breakdowns, and a personal organizer dashboard.
                  </p>

                  <div className="inline-grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm text-white/80 text-left mb-8 sm:mb-10">
                    <div className="flex items-center gap-2">🎓 <span>15+ matches</span></div>
                    <div className="flex items-center gap-2">📊 <span>Acceptance odds</span></div>
                    <div className="flex items-center gap-2">💰 <span>Tuition & aid</span></div>
                    <div className="flex items-center gap-2">📝 <span>Organizer</span></div>
                    <div className="flex items-center gap-2">⭐ <span>Save & notes</span></div>
                    <div className="flex items-center gap-2">📍 <span>Side-by-side</span></div>
                  </div>

                  <button onClick={() => { trackClick("Unlock Full Results CTA", "QuizResults"); startCheckout(toast); }} className="block">
                    <Button size="xl" className="rounded-full px-8 sm:px-12 gap-2 sm:gap-2.5 bg-white text-primary hover:bg-white/95 font-bold text-base sm:text-lg shadow-elevated hover:scale-[1.03] active:scale-[0.98] transition-all duration-200" asChild>
                      <span>
                      Unlock Full Results – $9.99/mo
                      <ArrowRight className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                      </span>
                    </Button>
                  </button>
                </motion.div>
              </div>
            </section>
          </>
        )}
        {user && (
          <section className="container px-4 max-w-4xl mx-auto pb-12">
            <Link to="/scholarship-hub" onClick={() => trackClick("Scholarship Hub CTA", "QuizResults")} className="block group">
              <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-elevated hover:shadow-card transition-all hover:scale-[1.01]">
                <div className="flex items-start md:items-center gap-4 md:gap-6 flex-col md:flex-row">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wider opacity-90 mb-1 font-semibold">New · Premium feature</div>
                    <h3 className="text-xl md:text-2xl font-bold mb-1">
                      Based on your profile, you may qualify for $32,000+ in scholarships.
                    </h3>
                    <p className="text-sm md:text-base opacity-90">
                      Find scholarships matched to your profile and stay organized.
                    </p>
                  </div>
                  <Button size="lg" className="bg-white text-primary hover:bg-white/95 font-bold shrink-0">
                    Open Scholarship Hub <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </Link>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default QuizResults;
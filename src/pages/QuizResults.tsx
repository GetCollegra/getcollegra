import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  CheckCircle2, MapPin, DollarSign, GraduationCap, Users, Loader2,
  Star, ArrowRight, TrendingUp, Sparkles,
  BarChart3, Target, Shield, Zap, Award, BookOpen, Globe, Lock, ChevronDown
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { trackClick } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type College = {
  name: string;
  location: string;
  acceptanceRate: string;
  ranking: string;
  tuitionInState: string;
  tuitionOutOfState: string;
  avgFinancialAid: string;
  netPrice: string;
  topPrograms: string[];
  campusSize: string;
  studentBody: string;
  studentFacultyRatio: string;
  setting: string;
  graduationRate: string;
  avgStartingSalary: string;
  fitScore: number;
  fitCategory: string;
  whyFit: string;
  prosForStudent: string[];
  consForStudent: string[];
  campusVibe: string;
  notableFeature: string;
};

type Recommendations = {
  studentProfile: {
    summary: string;
    topPriorities: string[];
    idealSchoolType: string;
  };
  colleges: College[];
  comparisonInsight: string;
};

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

const CollegeCard = ({ college, index }: { college: College; index: number }) => {
  const [expanded, setExpanded] = useState(false);
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
                <span className={fitScoreColor(college.fitScore)}>{college.fitScore}%</span>
              </motion.div>
            </div>
          </div>

          {/* Why Fit */}
          <p className="text-foreground text-sm sm:text-base leading-relaxed mb-4">{college.whyFit}</p>

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
          {college.prosForStudent.length > 0 && (
            <div className="mb-2">
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
        </div>

        {/* Stats Grid - responsive */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
          {[
            { icon: GraduationCap, label: "Acceptance", value: college.acceptanceRate },
            { icon: DollarSign, label: "Net Price", value: college.netPrice },
            { icon: BarChart3, label: "Grad Rate", value: college.graduationRate },
            { icon: TrendingUp, label: "Avg Salary", value: college.avgStartingSalary },
          ].map((stat, si) => (
            <div
              key={stat.label}
              className={`p-3 sm:p-4 md:p-5 ${si % 2 === 0 ? "border-r border-border" : ""} ${si < 2 ? "border-b md:border-b-0 border-border" : ""}`}
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
              <Link
                to="/coming-soon"
                onClick={() => trackClick("Unlock Premium Breakdown", "QuizResults")}
                className="block"
              >
                <Button
                  size="lg"
                  className="rounded-full px-6 sm:px-8 gap-2 sm:gap-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold shadow-elevated hover:shadow-card hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 w-full text-sm sm:text-base"
                >
                  Unlock Full Results – $9.99/mo
                  <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </Button>
              </Link>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const { toast } = useToast();

  // Read results passed via router state from Survey page
  const routerState = location.state as { recommendations?: Recommendations; surveyContext?: Record<string, string> } | null;

  const surveyContext = useMemo(() => {
    // Prefer router state survey context
    if (routerState?.surveyContext && Object.keys(routerState.surveyContext).length > 0) {
      return routerState.surveyContext;
    }
    // Fallback to URL params
    const context: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key === "__lovable_token" || key === "submission_id" || key.startsWith("__")) return;
      if (value.trim()) context[key] = value;
    });
    return context;
  }, [routerState, searchParams]);

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

  useEffect(() => {
    // If results were passed via router state, use them directly — no fetch needed
    if (routerState?.recommendations) {
      console.log("Using pre-fetched results from router state");
      setRecommendations(routerState.recommendations);
      setLoading(false);
      return;
    }

    // Fallback: fetch from edge function using URL params (e.g. direct URL access)
    const fetchRecommendations = async () => {
      const allParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (key === "__lovable_token" || key === "submission_id" || key.startsWith("__")) return;
        allParams[key] = value;
      });

      if (Object.keys(allParams).length === 0) {
        setError("No survey data found. Please take the quiz first.");
        setLoading(false);
        return;
      }

      const clean = (val: string | undefined, fallback: string): string => {
        if (!val) return fallback;
        const trimmed = val.trim();
        if (!trimmed || /^\{.*\}$/.test(trimmed)) return fallback;
        return trimmed;
      };

      const cleanedResponses: Record<string, string> = {};
      for (const [key, val] of Object.entries(allParams)) {
        const cleaned = clean(val, "");
        if (cleaned) cleanedResponses[key] = cleaned;
      }

      if (Object.keys(cleanedResponses).length === 0) {
        setError("No valid survey data found. Please take the quiz again.");
        setLoading(false);
        return;
      }

      const pickParam = (...keys: string[]) => {
        for (const key of keys) {
          const value = allParams[key];
          if (typeof value === "string" && value.trim()) return value;
        }
        return "";
      };

      const preferences = {
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
        allResponses: cleanedResponses,
      };

      try {
        const { data, error: fnError } = await supabase.functions.invoke("college-match", {
          body: { preferences },
        });
        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);
        setRecommendations(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load recommendations";
        setError(message);
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [routerState, searchParams, toast]);

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
              Your College Matches
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
              <div className="relative w-20 h-20 sm:w-24 sm:h-24">
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
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-primary" />
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
              <div className="flex gap-1.5">
                {loadingMessages.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: i === loadingMsgIndex ? 1.3 : 1 }}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === loadingMsgIndex ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
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
              <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full px-8">Try Again</Button>
            </motion.div>
          </section>
        )}

        {recommendations && !loading && (
          <>
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
                    Top 5 Matches
                  </motion.div>
                  <h2 className="font-display text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
                    Colleges picked for <span className="text-gradient">you</span>
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
                    Each school is scored based on how well it aligns with your unique goals, budget, and preferences.
                  </p>
                </motion.div>

                <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
                  {recommendations.colleges.map((college, i) => (
                    <CollegeCard key={college.name} college={college} index={i} />
                  ))}
                </div>
              </div>
            </section>

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
                          { label: "Net Price", key: "netPrice" },
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
                    Our Expert Take
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


            {/* CTA Section */}
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

                  <Link to="/coming-soon" onClick={() => trackClick("Unlock Full Results CTA", "QuizResults")} className="block">
                    <Button size="xl" className="rounded-full px-8 sm:px-12 gap-2 sm:gap-2.5 bg-white text-primary hover:bg-white/95 font-bold text-base sm:text-lg shadow-elevated hover:scale-[1.03] active:scale-[0.98] transition-all duration-200">
                      Unlock Full Results – $9.99/mo
                      <ArrowRight className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default QuizResults;
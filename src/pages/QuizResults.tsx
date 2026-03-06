import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2, MapPin, DollarSign, GraduationCap, Users, Loader2,
  Star, ArrowRight, TrendingUp, Sparkles,
  BarChart3, Target, Shield, Zap, Award, BookOpen, Globe, Lock
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

const QuizResults = () => {
  const [searchParams] = useSearchParams();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const allParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        allParams[key] = value;
      });

      const preferences = {
        email: allParams.email || "",
        cityState: allParams.city_state || "No preference",
        gpa: allParams.gpa || "",
        testScore: allParams.test_score || "None",
        campusSize: allParams.campus_size || "No preference",
        campusVibe: allParams.campus_vibe || "No preference",
        locationType: allParams.location_type || "No preference",
        maxCost: allParams.max_cost || "No preference",
        acceptanceRatePref: allParams.acceptance_rate_pref || "No preference",
        financialAid: allParams.financial_aid || "Important",
        campusLife: allParams.campus_life || "No preference",
        academicImportance: allParams.academic_importance || "No preference",
        distanceFromHome: allParams.distance_from_home || "No preference",
        areaOfStudy: allParams.area_of_study || "Undecided",
        allResponses: allParams,
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
  }, [searchParams, toast]);

  const fitScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500";
    if (score >= 75) return "text-primary";
    return "text-orange-500";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(210_90%_70%/0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(210_80%_30%/0.4),transparent_60%)]" />
        {/* Decorative circles */}
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-20 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        <div className="container px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-8 rotate-3"
            >
              <GraduationCap className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
              Your College Matches
              <br />
              <span className="text-white/70 text-2xl md:text-3xl lg:text-4xl">are ready</span>
            </h1>
            <p className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              We analyzed your unique preferences against real U.S. Department of Education data to find schools that truly fit you.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">
        {/* Loading State */}
        {loading && (
          <section className="py-32">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
              {/* Animated loader */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full border-4 border-accent/30 border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingMsgIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-foreground text-lg font-semibold"
                >
                  {loadingMessages[loadingMsgIndex]}
                </motion.p>
              </AnimatePresence>
              <div className="flex gap-1.5">
                {loadingMessages.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === loadingMsgIndex ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            </motion.div>
          </section>
        )}

        {/* Error */}
        {error && !loading && (
          <section className="py-28 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-destructive text-2xl">!</span>
              </div>
              <p className="text-foreground font-semibold text-lg mb-2">Something went wrong</p>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full px-8">Try Again</Button>
            </div>
          </section>
        )}

        {recommendations && !loading && (
          <>
            {/* Student Profile Section */}
            <section className="py-16 md:py-24 bg-gradient-subtle">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="text-center mb-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                    >
                      <Users className="w-6 h-6 text-primary" />
                    </motion.div>
                    <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-2">Your Profile</p>
                    <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">
                      What we learned about you
                    </h2>
                  </div>

                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-lg opacity-50" />
                    <div className="relative bg-card border border-border rounded-2xl p-8 md:p-10 shadow-soft">
                      <p className="text-foreground text-lg leading-relaxed mb-8">{recommendations.studentProfile.summary}</p>
                      <div className="flex flex-wrap gap-3 mb-6">
                        {recommendations.studentProfile.topPriorities.map((p, i) => (
                          <motion.span
                            key={p}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            className="px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/15"
                          >
                            {p}
                          </motion.span>
                        ))}
                      </div>
                      <div className="flex items-start gap-3 px-5 py-4 bg-muted/50 rounded-xl">
                        <BookOpen className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-muted-foreground text-sm italic leading-relaxed">{recommendations.studentProfile.idealSchoolType}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* College Matches Section */}
            <section className="py-16 md:py-24 bg-background">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-16"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                    <Award className="w-4 h-4" />
                    Top 5 Matches
                  </div>
                  <h2 className="font-display text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                    Colleges picked for <span className="text-gradient">you</span>
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Each school is scored based on how well it aligns with your unique goals, budget, and preferences.
                  </p>
                </motion.div>

                <div className="max-w-5xl mx-auto space-y-6">
                  {recommendations.colleges.map((college, i) => {
                    const catConfig = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
                    const CatIcon = catConfig.icon;
                    

                    return (
                      <motion.div
                        key={college.name}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                        className="group"
                      >
                        <div className="relative bg-card border rounded-2xl overflow-hidden transition-all duration-300 shadow-soft border-border hover:shadow-card hover:border-border/80">
                          {/* Rank badge */}
                          <div className={`absolute top-0 left-0 w-12 h-12 bg-gradient-to-br ${catConfig.gradient} flex items-end justify-end rounded-br-2xl`}>
                            <span className="text-white font-bold text-lg mr-2.5 mb-1">{i + 1}</span>
                          </div>

                          {/* Card Header */}
                          <div className="p-6 md:p-8 pl-16 md:pl-20">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                              <div>
                                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-2">{college.name}</h3>
                                <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {college.location}</span>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {college.setting}</span>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span>{college.ranking}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold ${catConfig.bg} ${catConfig.color} ${catConfig.border} border`}>
                                  <CatIcon className="w-3.5 h-3.5" />
                                  {college.fitCategory}
                                </div>
                                <div className="flex items-center gap-1.5 font-bold px-4 py-2 rounded-full text-sm bg-card border-2 border-border">
                                  <Star className={`w-4 h-4 fill-current ${fitScoreColor(college.fitScore)}`} />
                                  <span className={fitScoreColor(college.fitScore)}>{college.fitScore}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Why Fit */}
                            <p className="text-foreground leading-relaxed mb-4">{college.whyFit}</p>

                            {/* Campus vibe + notable feature */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                              <div className="flex items-start gap-2 px-4 py-3 bg-muted/40 rounded-xl flex-1">
                                <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                                <p className="text-foreground text-sm"><span className="font-semibold">Vibe:</span> {college.campusVibe}</p>
                              </div>
                              <div className="flex items-start gap-2 px-4 py-3 bg-primary/5 rounded-xl flex-1">
                                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <p className="text-foreground text-sm"><span className="font-semibold">Standout:</span> {college.notableFeature}</p>
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
                            {[
                              { icon: GraduationCap, label: "Acceptance", value: college.acceptanceRate },
                              { icon: DollarSign, label: "Net Price", value: college.netPrice },
                              { icon: BarChart3, label: "Grad Rate", value: college.graduationRate },
                              { icon: TrendingUp, label: "Avg Salary", value: college.avgStartingSalary },
                            ].map((stat, si) => (
                              <div key={stat.label} className={`p-4 md:p-5 ${si < 3 ? "border-r border-border" : ""} ${si < 2 ? "border-b md:border-b-0 border-border" : si === 2 ? "border-b md:border-b-0 border-border" : ""}`}>
                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                                  <stat.icon className="w-3.5 h-3.5" /> {stat.label}
                                </div>
                                <p className="font-bold text-foreground text-lg">{stat.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Premium Paywall - View Full Breakdown */}
                          <div className="relative border-t border-border overflow-hidden">
                            {/* Blurred preview content */}
                            <div className="p-6 md:p-8 select-none pointer-events-none" aria-hidden="true">
                              <div className="blur-[6px] opacity-40">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                  {[
                                    { label: "Tuition (In-State)", value: college.tuitionInState },
                                    { label: "Tuition (Out-of-State)", value: college.tuitionOutOfState },
                                    { label: "Avg Financial Aid", value: college.avgFinancialAid },
                                    { label: "Student:Faculty", value: college.studentFacultyRatio },
                                    { label: "Student Body", value: college.studentBody },
                                    { label: "Campus Size", value: college.campusSize },
                                  ].map((item) => (
                                    <div key={item.label} className="p-4 bg-muted/30 rounded-xl">
                                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                                      <p className="font-semibold text-foreground">{item.value}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="p-5 bg-muted/20 rounded-xl h-28" />
                                  <div className="p-5 bg-muted/20 rounded-xl h-28" />
                                </div>
                              </div>
                            </div>

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-card from-40% via-card/90 to-transparent flex items-center justify-center p-6">
                              <div className="text-center max-w-sm">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 mb-5 shadow-soft">
                                  <Lock className="w-6 h-6 text-primary" />
                                </div>
                                <h4 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
                                  Unlock your full college plan
                                </h4>
                                <p className="text-muted-foreground text-sm mb-6">
                                  With Collegra Premium you get:
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-foreground mx-auto max-w-xs mb-7">
                                  <div className="flex items-center gap-2 text-left">🎓 <span>15+ matches</span></div>
                                  <div className="flex items-center gap-2 text-left">📊 <span>Acceptance odds</span></div>
                                  <div className="flex items-center gap-2 text-left">💰 <span>Tuition & aid</span></div>
                                  <div className="flex items-center gap-2 text-left">📝 <span>Organizer</span></div>
                                  <div className="flex items-center gap-2 text-left">⭐ <span>Save & notes</span></div>
                                  <div className="flex items-center gap-2 text-left">📍 <span>Side-by-side</span></div>
                                  <div className="flex items-center gap-2 text-left col-span-2 justify-center">🔍 <span>Smarter recommendations</span></div>
                                </div>
                                <Link
                                  to="/coming-soon"
                                  onClick={() => trackClick("Unlock Premium Breakdown", "QuizResults")}
                                  className="block"
                                >
                                  <Button
                                    size="lg"
                                    className="rounded-full px-8 gap-2.5 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold shadow-elevated hover:shadow-card hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 w-full text-base"
                                  >
                                    Unlock Full Results – $9.99/mo
                                    <ArrowRight className="w-4.5 h-4.5" />
                                  </Button>
                                </Link>
                                <p className="text-muted-foreground text-xs mt-3">Cancel anytime • 14-day free trial</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Comparison Table Section */}
            <section className="py-16 md:py-24 bg-muted/20">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-12"
                >
                  <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-2">Side-by-Side</p>
                  <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">
                    Compare at a glance
                  </h2>
                  <p className="text-muted-foreground">Swipe or scroll to see all schools</p>
                </motion.div>

                <div className="max-w-6xl mx-auto">
                  <div className="overflow-x-auto rounded-2xl border border-border shadow-soft bg-card">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-border bg-muted/30">
                          <th className="text-left p-4 md:p-5 text-muted-foreground font-semibold min-w-[140px] sticky left-0 bg-muted/30 z-10">Factor</th>
                          {recommendations.colleges.map((c) => (
                            <th key={c.name} className="text-center p-4 md:p-5 text-foreground font-semibold min-w-[160px]">
                              <div className="text-sm">{c.name}</div>
                              <div className="flex items-center justify-center gap-1 mt-1.5">
                                <Star className={`w-3 h-3 fill-current ${fitScoreColor(c.fitScore)}`} />
                                <span className={`text-xs font-bold ${fitScoreColor(c.fitScore)}`}>{c.fitScore}%</span>
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
                        ].map((row, ri) => (
                          <tr key={row.key} className={`border-b border-border last:border-b-0 ${ri % 2 === 0 ? "bg-muted/10" : ""}`}>
                            <td className="p-4 md:p-5 text-muted-foreground font-medium sticky left-0 bg-card z-10">{row.label}</td>
                            {recommendations.colleges.map((c) => (
                              <td key={c.name} className="p-4 md:p-5 text-center text-foreground">
                                {row.key === "fitCategory" ? (
                                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${(fitCategoryConfig[c.fitCategory] || fitCategoryConfig.Match).bg} ${(fitCategoryConfig[c.fitCategory] || fitCategoryConfig.Match).color}`}>
                                    {c[row.key as keyof College] as string}
                                  </span>
                                ) : (
                                  <span className="font-medium">{c[row.key as keyof College] as string}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* AI Insight Section */}
            <section className="py-16 md:py-24 bg-background">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-3xl mx-auto text-center"
                >
                  <div className="relative inline-block mb-8">
                    <div className="absolute -inset-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-8">
                    Our Expert Take
                  </h2>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-3xl blur-lg" />
                    <div className="relative bg-card border border-border rounded-2xl p-8 md:p-10 shadow-soft">
                      <p className="text-foreground text-lg leading-relaxed italic">
                        "{recommendations.comparisonInsight}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-20 md:py-28 overflow-hidden">
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm mb-6">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
                    Unlock your full college plan
                  </h2>
                  <p className="text-white/75 text-lg mb-8 leading-relaxed max-w-lg mx-auto">
                    Get 15+ matches, acceptance estimates, financial breakdowns, and a personal organizer dashboard.
                  </p>

                  <div className="inline-grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-white/80 text-left mb-10">
                    <div className="flex items-center gap-2">🎓 <span>15+ matches</span></div>
                    <div className="flex items-center gap-2">📊 <span>Acceptance odds</span></div>
                    <div className="flex items-center gap-2">💰 <span>Tuition & aid</span></div>
                    <div className="flex items-center gap-2">📝 <span>Organizer</span></div>
                    <div className="flex items-center gap-2">⭐ <span>Save & notes</span></div>
                    <div className="flex items-center gap-2">📍 <span>Side-by-side</span></div>
                  </div>

                  <Link to="/coming-soon" onClick={() => trackClick("Unlock Full Results CTA", "QuizResults")} className="block">
                    <Button size="xl" className="rounded-full px-12 gap-2.5 bg-white text-primary hover:bg-white/95 font-bold text-lg shadow-elevated hover:scale-[1.03] active:scale-[0.98] transition-all duration-200">
                      Unlock Full Results – $9.99/mo
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <p className="text-white/50 text-sm mt-4">Cancel anytime • 14-day free trial</p>
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

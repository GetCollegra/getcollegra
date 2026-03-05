import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2, MapPin, DollarSign, GraduationCap, Users, Loader2,
  Star, ArrowRight, TrendingUp, ThumbsUp, ThumbsDown, Sparkles,
  BarChart3, Target, Shield, Zap
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

const fitCategoryConfig: Record<string, { color: string; bg: string; icon: typeof Target }> = {
  Reach: { color: "text-orange-600", bg: "bg-orange-100", icon: TrendingUp },
  Match: { color: "text-primary", bg: "bg-primary/10", icon: Target },
  Safety: { color: "text-emerald-600", bg: "bg-emerald-100", icon: Shield },
};

const QuizResults = () => {
  const [searchParams] = useSearchParams();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendations = async () => {
      // Collect all URL params - captures both known Tally fields and any extras
      const allParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        allParams[key] = value;
      });

      const preferences = {
        // Q1-Q4: Basic info
        email: allParams.email || "",
        cityState: allParams.city_state || "No preference",
        gpa: allParams.gpa || "",
        testScore: allParams.test_score || "None",
        // Q5: Campus size
        campusSize: allParams.campus_size || "No preference",
        // Q6: Campus vibe
        campusVibe: allParams.campus_vibe || "No preference",
        // Q7: Location type
        locationType: allParams.location_type || "No preference",
        // Q8: Max cost per year
        maxCost: allParams.max_cost || "No preference",
        // Q9: Acceptance rate preference
        acceptanceRatePref: allParams.acceptance_rate_pref || "No preference",
        // Q10: Financial aid importance
        financialAid: allParams.financial_aid || "Important",
        // Q11: Campus life interests
        campusLife: allParams.campus_life || "No preference",
        // Q12: Academic importance
        academicImportance: allParams.academic_importance || "No preference",
        // Q13: Distance from home
        distanceFromHome: allParams.distance_from_home || "No preference",
        // Q14: Area of study
        areaOfStudy: allParams.area_of_study || "Undecided",
        // All raw params
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(210_90%_60%/0.15),transparent_60%)]" />
        <div className="container px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
              Your Personalized College Matches
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
              Collegra's AI analyzed your preferences and found colleges that actually fit you — not just any list.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">
        {/* Loading */}
        {loading && (
          <section className="py-28">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <Sparkles className="w-5 h-5 text-accent absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-foreground text-lg font-semibold">Analyzing your preferences...</p>
              <p className="text-muted-foreground text-sm">Finding your best-fit colleges with real data</p>
            </motion.div>
          </section>
        )}

        {/* Error */}
        {error && !loading && (
          <section className="py-28 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
          </section>
        )}

        {recommendations && !loading && (
          <>
            {/* Student Profile Section */}
            <section className="py-16 md:py-20 bg-background border-b border-border">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="text-center mb-10">
                    <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Your Profile</p>
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                      What we learned about you
                    </h2>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-8 shadow-soft mb-8">
                    <p className="text-foreground text-lg leading-relaxed mb-6">{recommendations.studentProfile.summary}</p>
                    <div className="flex flex-wrap gap-3 mb-4">
                      {recommendations.studentProfile.topPriorities.map((p) => (
                        <span key={p} className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm italic">{recommendations.studentProfile.idealSchoolType}</p>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* College Matches Section */}
            <section className="py-16 md:py-20 bg-muted/30 border-b border-border">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-14"
                >
                  <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Your Matches</p>
                  <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-4">
                    Top 5 colleges for you
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Each college is scored based on how well it matches your specific preferences and goals.
                  </p>
                </motion.div>

                <div className="max-w-5xl mx-auto space-y-8">
                  {recommendations.colleges.map((college, i) => {
                    const catConfig = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
                    const CatIcon = catConfig.icon;
                    const isExpanded = expandedCard === i;

                    return (
                      <motion.div
                        key={college.name}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300"
                      >
                        {/* Card Header */}
                        <div className="p-6 md:p-8">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl font-bold text-primary">#{i + 1}</span>
                                <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">{college.name}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm">
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {college.location}</span>
                                <span>•</span>
                                <span>{college.setting}</span>
                                <span>•</span>
                                <span>{college.ranking}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${catConfig.bg} ${catConfig.color}`}>
                                <CatIcon className="w-3.5 h-3.5" />
                                {college.fitCategory}
                              </div>
                              <div className="flex items-center gap-1.5 bg-primary/10 text-primary font-bold px-4 py-2 rounded-full text-sm">
                                <Star className="w-4 h-4 fill-primary" />
                                {college.fitScore}% Fit
                              </div>
                            </div>
                          </div>

                          {/* Why Fit */}
                          <p className="text-foreground leading-relaxed mb-4">{college.whyFit}</p>
                          <p className="text-muted-foreground text-sm italic mb-4">"{college.campusVibe}"</p>

                          {/* Notable Feature */}
                          <div className="flex items-start gap-2 px-4 py-3 bg-accent/5 rounded-xl mb-6">
                            <Zap className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                            <p className="text-foreground text-sm font-medium">{college.notableFeature}</p>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
                          <div className="bg-card p-4 md:p-5">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                              <GraduationCap className="w-3.5 h-3.5" /> Acceptance
                            </div>
                            <p className="font-bold text-foreground text-lg">{college.acceptanceRate}</p>
                          </div>
                          <div className="bg-card p-4 md:p-5">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                              <DollarSign className="w-3.5 h-3.5" /> Net Price
                            </div>
                            <p className="font-bold text-foreground text-lg">{college.netPrice}</p>
                          </div>
                          <div className="bg-card p-4 md:p-5">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                              <BarChart3 className="w-3.5 h-3.5" /> Grad Rate
                            </div>
                            <p className="font-bold text-foreground text-lg">{college.graduationRate}</p>
                          </div>
                          <div className="bg-card p-4 md:p-5">
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                              <TrendingUp className="w-3.5 h-3.5" /> Avg Salary
                            </div>
                            <p className="font-bold text-foreground text-lg">{college.avgStartingSalary}</p>
                          </div>
                        </div>

                        {/* Expand/Collapse Details */}
                        <div className="p-6 md:p-8">
                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : i)}
                            className="text-primary text-sm font-semibold hover:underline mb-4"
                          >
                            {isExpanded ? "Show less ↑" : "Show full breakdown ↓"}
                          </button>

                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="space-y-6 mt-4"
                            >
                              {/* More Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Tuition (In-State)</p>
                                  <p className="font-semibold text-foreground">{college.tuitionInState}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Tuition (Out-of-State)</p>
                                  <p className="font-semibold text-foreground">{college.tuitionOutOfState}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Avg Financial Aid</p>
                                  <p className="font-semibold text-foreground">{college.avgFinancialAid}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Student:Faculty</p>
                                  <p className="font-semibold text-foreground">{college.studentFacultyRatio}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Student Body</p>
                                  <p className="font-semibold text-foreground">{college.studentBody}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Campus Size</p>
                                  <p className="font-semibold text-foreground">{college.campusSize}</p>
                                </div>
                              </div>

                              {/* Programs */}
                              <div>
                                <p className="text-xs text-muted-foreground mb-2">Top Programs for You</p>
                                <div className="flex flex-wrap gap-2">
                                  {college.topPrograms.map((prog) => (
                                    <span key={prog} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                                      {prog}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Pros & Cons */}
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                                    <ThumbsUp className="w-4 h-4 text-emerald-600" /> Why it works for you
                                  </p>
                                  <ul className="space-y-2">
                                    {college.prosForStudent.map((pro, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                        {pro}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                                    <ThumbsDown className="w-4 h-4 text-orange-500" /> Things to consider
                                  </p>
                                  <ul className="space-y-2">
                                    {college.consForStudent.map((con, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                        {con}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Comparison Table Section */}
            <section className="py-16 md:py-20 bg-background border-b border-border">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-10"
                >
                  <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Side-by-Side</p>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Compare your matches at a glance
                  </h2>
                </motion.div>

                <div className="max-w-6xl mx-auto overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left p-4 text-muted-foreground font-semibold min-w-[140px]">Factor</th>
                        {recommendations.colleges.map((c) => (
                          <th key={c.name} className="text-center p-4 text-foreground font-semibold min-w-[160px]">
                            <div>{c.name}</div>
                            <div className="flex items-center justify-center gap-1 mt-1 text-primary text-xs font-bold">
                              <Star className="w-3 h-3 fill-primary" /> {c.fitScore}%
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
                        <tr key={row.key} className={ri % 2 === 0 ? "bg-muted/30" : ""}>
                          <td className="p-4 text-muted-foreground font-medium">{row.label}</td>
                          {recommendations.colleges.map((c) => (
                            <td key={c.name} className="p-4 text-center text-foreground">
                              {row.key === "fitCategory" ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(fitCategoryConfig[c.fitCategory] || fitCategoryConfig.Match).bg} ${(fitCategoryConfig[c.fitCategory] || fitCategoryConfig.Match).color}`}>
                                  {c[row.key as keyof College] as string}
                                </span>
                              ) : (
                                c[row.key as keyof College] as string
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* AI Insight Section */}
            <section className="py-16 md:py-20 bg-muted/30 border-b border-border">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="max-w-3xl mx-auto text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
                    AI Insight
                  </h2>
                  <p className="text-foreground text-lg leading-relaxed bg-card border border-border rounded-2xl p-8 shadow-soft">
                    {recommendations.comparisonInsight}
                  </p>
                </motion.div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 md:py-28 bg-gradient-hero text-white">
              <div className="container px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center max-w-2xl mx-auto"
                >
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                    Ready to go deeper?
                  </h2>
                  <p className="text-white/80 text-lg mb-8">
                    Get ongoing personalized guidance, updated match lists, and decision-making tools to make your final choice with confidence.
                  </p>
                  <Link to="/coming-soon" onClick={() => trackClick("Unlock Full Results", "QuizResults")}>
                    <Button size="xl" className="rounded-full px-10 gap-2 bg-white text-primary hover:bg-white/90 font-bold text-lg">
                      Unlock Full Results <ArrowRight className="w-5 h-5" />
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

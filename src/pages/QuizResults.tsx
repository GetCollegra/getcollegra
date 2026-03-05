import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MapPin, DollarSign, GraduationCap, Users, Loader2, Star, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AskAI from "@/components/AskAI";
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
  topPrograms: string[];
  campusSize: string;
  studentBody: string;
  setting: string;
  fitScore: number;
  whyFit: string;
};

type Recommendations = {
  summary: string;
  colleges: College[];
};

const QuizResults = () => {
  const [searchParams] = useSearchParams();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendations = async () => {
      // Extract preferences from URL params (from Tally redirect)
      const preferences = {
        major: searchParams.get("major") || searchParams.get("field") || "Undecided",
        campusSize: searchParams.get("campus_size") || searchParams.get("size") || "No preference",
        location: searchParams.get("location") || searchParams.get("setting") || "No preference",
        budget: searchParams.get("budget") || "No preference",
        academicInterests: searchParams.get("academic_interests") || searchParams.get("interests") || "General",
        extracurriculars: searchParams.get("extracurriculars") || searchParams.get("activities") || "Various",
        region: searchParams.get("region") || searchParams.get("climate") || "No preference",
        financialAid: searchParams.get("financial_aid") || "Important",
        additionalNotes: searchParams.get("notes") || "None",
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
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-16 md:py-24">
        <div className="container px-4 max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Personalized College Matches
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Based on your quiz responses, Collegra's AI analyzed your preferences and found the best-fit colleges for you.
            </p>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground text-lg">Analyzing your preferences and finding matches...</p>
              <p className="text-muted-foreground/60 text-sm">This may take a few seconds</p>
            </motion.div>
          )}

          {/* Error State */}
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </motion.div>
          )}

          {/* Results */}
          {recommendations && !loading && (
            <>
              {/* Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-10 shadow-sm"
              >
                <p className="text-foreground text-lg leading-relaxed">{recommendations.summary}</p>
              </motion.div>

              {/* College Cards */}
              <div className="space-y-6">
                {recommendations.colleges.map((college, i) => (
                  <motion.div
                    key={college.name}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between p-6 pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-primary">#{i + 1}</span>
                          <h2 className="text-xl md:text-2xl font-bold text-foreground">{college.name}</h2>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{college.location}</span>
                          <span className="mx-1">•</span>
                          <span>{college.setting}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary font-bold px-3 py-1.5 rounded-full text-sm shrink-0">
                        <Star className="w-4 h-4 fill-primary" />
                        {college.fitScore}% Fit
                      </div>
                    </div>

                    {/* Why Fit */}
                    <div className="px-6 pb-4">
                      <p className="text-muted-foreground text-sm leading-relaxed">{college.whyFit}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
                      <div className="bg-card p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          Acceptance Rate
                        </div>
                        <p className="font-semibold text-foreground">{college.acceptanceRate}</p>
                      </div>
                      <div className="bg-card p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          Tuition (In-State)
                        </div>
                        <p className="font-semibold text-foreground">{college.tuitionInState}</p>
                      </div>
                      <div className="bg-card p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          Avg. Financial Aid
                        </div>
                        <p className="font-semibold text-foreground">{college.avgFinancialAid}</p>
                      </div>
                      <div className="bg-card p-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                          <Users className="w-3.5 h-3.5" />
                          Student Body
                        </div>
                        <p className="font-semibold text-foreground">{college.studentBody}</p>
                      </div>
                    </div>

                    {/* Programs & Details */}
                    <div className="p-6 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Top Programs</p>
                        <div className="flex flex-wrap gap-1.5">
                          {college.topPrograms.map((prog) => (
                            <span
                              key={prog}
                              className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                            >
                              {prog}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {college.ranking} • {college.campusSize}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-center mt-12"
              >
                <Link to="/coming-soon" onClick={() => trackClick("Unlock Full Results", "QuizResults")}>
                  <Button size="xl" variant="hero" className="rounded-full px-10 gap-2">
                    Unlock Full Results <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </main>

      <AskAI />
      <Footer />
    </div>
  );
};

export default QuizResults;

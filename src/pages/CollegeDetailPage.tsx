import { useState, useEffect, useMemo, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import CollegeLifePanel from "@/components/CollegeLifePanel";
import TravelFromHome from "@/components/TravelFromHome";
import StudentVibeReviews from "@/components/StudentVibeReviews";
import SportsSection from "@/components/SportsSection";
import ClassroomExperienceSection from "@/components/ClassroomExperienceSection";
import WalkabilitySection from "@/components/WalkabilitySection";
import AdmittedStudentSection from "@/components/AdmittedStudentSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, GraduationCap, MapPin, Heart, ArrowLeft, BookmarkPlus, Bookmark,
  Target, DollarSign, Award, Users, Wallet, Briefcase, BookOpen,
  ThumbsUp, ThumbsDown, AlertTriangle, Sparkles
} from "lucide-react";
import type { College } from "@/types/college";
import { trackCollegeAction, trackCollegeDwell } from "@/lib/userActions";

const CollegeMap = lazy(() => import("@/components/CollegeMap"));
const CampusNeighborhood = lazy(() => import("@/components/CampusNeighborhood"));

class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-medium">Map failed to load</p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false })}>Try Again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const fitCategoryConfig: Record<string, { color: string; bg: string }> = {
  Reach: { color: "text-orange-600", bg: "bg-orange-50" },
  Match: { color: "text-primary", bg: "bg-primary/5" },
  Likely: { color: "text-emerald-600", bg: "bg-emerald-50" }, // legacy support
  Safety: { color: "text-emerald-600", bg: "bg-emerald-50" },
};

const CollegeDetailPage = () => {
  const { user, loading: authLoading, isSubscribed } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const collegeName = searchParams.get("name") || "";
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [homeAddress, setHomeAddress] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showNeighborhood, setShowNeighborhood] = useState(false);
  const [athleteInterest, setAthleteInterest] = useState(false);
  const [sportInterests, setSportInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Load college data
  useEffect(() => {
    if (!user || !collegeName) return;
    const load = async () => {
      // Check saved_colleges first
      const { data: savedData } = await supabase
        .from("saved_colleges")
        .select("*")
        .eq("user_id", user.id)
        .eq("college_name", collegeName)
        .limit(1);

      if (savedData && savedData.length > 0) {
        setCollege(savedData[0].college_data as unknown as College);
        setIsSaved(true);
        setSavedId(savedData[0].id);
      }

      // Also check college_matches for richer data
      const { data: matchData } = await supabase
        .from("college_matches")
        .select("college_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (matchData) {
        for (const m of matchData) {
          const arr = m.college_data as unknown;
          if (Array.isArray(arr)) {
            const found = (arr as College[]).find(c => c.name === collegeName);
            if (found) {
              setCollege(prev => {
                if (!prev) return found;
                // Merge: prefer non-Premium values
                const merged = { ...prev };
                for (const key of Object.keys(found) as (keyof College)[]) {
                  if ((merged as any)[key] === "Premium" && (found as any)[key] !== undefined) {
                    (merged as any)[key] = (found as any)[key];
                  }
                }
                return merged;
              });
              break;
            }
          }
        }
      }

      // Load profile for home address
      const { data: profileData } = await supabase.from("profiles").select("home_address").eq("id", user.id).single();
      if (profileData?.home_address) setHomeAddress(profileData.home_address);

      // Detect athlete interest from latest quiz answers
      const { data: quiz } = await supabase
        .from("quiz_answers")
        .select("answers")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (quiz?.answers) {
        const blob = JSON.stringify(quiz.answers).toLowerCase();
        const SPORT_KEYS = ["football","basketball","soccer","lacrosse","baseball","softball","volleyball","track","swim","hockey","tennis","wrestl","row"];
        const matched = SPORT_KEYS.filter((k) => blob.includes(k));
        if (matched.length > 0 || /\bsport|athlet/.test(blob)) {
          setAthleteInterest(true);
        }
        if (matched.length > 0) setSportInterests(matched);
      }

      setLoading(false);
    };
    load();
  }, [user, collegeName]);

  // ── Track view + dwell time ──
  useEffect(() => {
    if (!user || !collegeName || loading) return;
    trackCollegeAction(collegeName, "view");
    const startedAt = Date.now();
    return () => {
      trackCollegeDwell(collegeName, Date.now() - startedAt);
    };
  }, [user, collegeName, loading]);

  // ── Track tab clicks ──
  const handleTabChange = (next: string) => {
    setActiveTab(next);
    if (!collegeName) return;
    if (next === "map") trackCollegeAction(collegeName, "click_map");
    else if (next === "college-life") trackCollegeAction(collegeName, "click_life");
  };

  const saveCollege = async () => {
    if (!user || !college) return;
    const { data, error } = await supabase
      .from("saved_colleges")
      .insert({ user_id: user.id, college_name: college.name, college_data: college as any })
      .select()
      .single();
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else if (data) {
      setIsSaved(true);
      setSavedId(data.id);
      trackCollegeAction(college.name, "click_save");
      toast({ title: "Saved!", description: `${college.name} added to your list.` });
    }
  };

  const unsaveCollege = async () => {
    if (!savedId) return;
    await supabase.from("saved_colleges").delete().eq("id", savedId);
    setIsSaved(false);
    setSavedId(null);
    toast({ title: "Removed from saved list" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !college) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <GraduationCap className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">College not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const cat = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container px-4 pt-24 pb-16 max-w-5xl mx-auto">
        {/* Back Button */}
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        {/* College Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-card border-border shadow-soft mb-6 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 shrink-0">
                    <GraduationCap className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-foreground">{college.name}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{college.location}</span>
                      <Badge className={`${cat.bg} ${cat.color} border-0 text-xs`}>{college.fitCategory}</Badge>
                      <span className="font-bold text-primary text-lg">{college.fitScore}% match</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant={isSaved ? "outline" : "default"}
                  onClick={isSaved ? unsaveCollege : saveCollege}
                  className="shrink-0 gap-1.5"
                >
                  {isSaved ? <><Bookmark className="h-4 w-4" /> Saved</> : <><BookmarkPlus className="h-4 w-4" /> Save College</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1 bg-muted/50 p-1.5 rounded-xl mb-6">
            <TabsTrigger value="overview" className="gap-1.5 text-sm rounded-lg data-[state=active]:shadow-soft">
              <Sparkles className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 text-sm rounded-lg data-[state=active]:shadow-soft">
              <MapPin className="h-4 w-4" /> Map & Location
            </TabsTrigger>
            <TabsTrigger value="college-life" className="gap-1.5 text-sm rounded-lg data-[state=active]:shadow-soft">
              <Heart className="h-4 w-4" /> College Life
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Acceptance Rate", value: college.acceptanceRate, icon: Target },
                  { label: "Net Price", value: college.netPrice, icon: DollarSign },
                  { label: "Graduation Rate", value: college.graduationRate, icon: Award },
                  { label: "Student Body", value: college.studentBody, icon: Users },
                  { label: "In-State Tuition", value: college.tuitionInState, icon: DollarSign },
                  { label: "Out-of-State Tuition", value: college.tuitionOutOfState, icon: DollarSign },
                  { label: "Financial Aid", value: college.avgFinancialAid, icon: Wallet },
                  { label: "Avg Starting Salary", value: college.avgStartingSalary, icon: Briefcase },
                ].filter(i => i.value && i.value !== "Premium" && i.value !== "—").map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="bg-card rounded-xl p-4 border border-border/60 transition-all hover:border-primary/40 hover:shadow-soft">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                        <Icon className="h-3.5 w-3.5 text-primary" />{item.label}
                      </div>
                      <p className="text-base font-bold text-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Why It Fits + Campus Vibe + Notable Feature */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-card border-border/60 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardContent className="p-5 pl-6">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Why It's a Good Fit</p>
                    <p className="text-sm text-foreground leading-relaxed">{college.whyFit || "—"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/60 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                  <CardContent className="p-5 pl-6">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Campus Vibe</p>
                    <p className="text-sm text-foreground leading-relaxed">{college.campusVibe || "—"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/60 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                  <CardContent className="p-5 pl-6">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notable Feature</p>
                    <p className="text-sm text-foreground leading-relaxed">{college.notableFeature || "—"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Programs */}
              {college.topPrograms?.length > 0 && (
                <div className="bg-gradient-to-r from-secondary/80 to-muted/40 rounded-xl p-5 border border-border/50">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Top Programs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {college.topPrograms.map((prog, i) => (
                      <Badge key={i} className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs px-3 py-1">{prog}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pros / Cons */}
              <div className="grid md:grid-cols-2 gap-4">
                {college.prosForStudent?.length > 0 && (
                  <Card className="bg-card border-border/60 overflow-hidden">
                    <CardContent className="p-5">
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                        <ThumbsUp className="h-4 w-4" /> Pros
                      </p>
                      <ul className="space-y-2">
                        {college.prosForStudent.map((pro, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />{pro}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {college.consForStudent?.length > 0 && (
                  <Card className="bg-card border-border/60 overflow-hidden">
                    <CardContent className="p-5">
                      <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5">
                        <ThumbsDown className="h-4 w-4" /> Cons
                      </p>
                      <ul className="space-y-2">
                        {college.consForStudent.map((con, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />{con}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* How to Get In */}
              {college.howToGetIn && college.howToGetIn !== "—" && (
                <Card className="bg-card border-primary/20 overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                  <CardContent className="p-5 pt-6">
                    <p className="text-sm font-bold text-primary mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> How to Get In
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{college.howToGetIn}</p>
                  </CardContent>
                </Card>
              )}

              {/* Admitted Student Data */}
              <AdmittedStudentSection college={college} />

              {/* Classroom Experience */}
              <ClassroomExperienceSection college={college} />

              {/* Walkability */}
              <WalkabilitySection college={college} />

              {/* Sports & Athletics */}
              <SportsSection college={college} showRecruiting={athleteInterest} highlightSports={sportInterests} />

              {/* Student Vibe Reviews */}
              <StudentVibeReviews collegeName={college.name} />
            </motion.div>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <MapErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                  <CollegeMap
                    matchedColleges={[college]}
                    savedColleges={isSaved ? [{ college_data: college, college_name: college.name }] : []}
                    homeLocation={homeAddress}
                    homeAddress={homeAddress}
                    onCollegeSelect={() => setShowNeighborhood(true)}
                    selectedCollege={college.name}
                  />
                </Suspense>
              </MapErrorBoundary>

              {/* Travel from home */}
              {homeAddress && (
                <TravelFromHome college={college} homeAddress={homeAddress} />
              )}

              {/* Campus Neighborhood */}
              <div>
                {!showNeighborhood ? (
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setShowNeighborhood(true); trackCollegeAction(college.name, "click_neighborhood"); }}>
                    <MapPin className="h-4 w-4" /> Open Campus Area Explorer
                  </Button>
                ) : (
                  <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                    <CampusNeighborhood college={college} homeLocation={homeAddress} onClose={() => setShowNeighborhood(false)} />
                  </Suspense>
                )}
              </div>
            </motion.div>
          </TabsContent>

          {/* College Life Tab */}
          <TabsContent value="college-life">
            <CollegeLifePanel college={college} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CollegeDetailPage;

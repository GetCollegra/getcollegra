import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Header from "@/components/Header";
import CollegeComparison from "@/components/CollegeComparison";
import CollegeNotesPanel, { parseNotes, type StructuredNotes } from "@/components/CollegeNotesPanel";
import {
  GraduationCap, Star, BookmarkPlus, Bookmark, BarChart3, StickyNote,
  Sparkles, MapPin, DollarSign, Target, Shield, TrendingUp,
  LogOut, Trophy, Navigation, Wallet, Loader2, Trash2, Plus, Search,
  ChevronDown, Users, BookOpen, Briefcase, Award, Lock, Heart, Zap, Eye,
  ThumbsUp, ThumbsDown, Settings
} from "lucide-react";
import type { College } from "@/types/college";
import PremiumPaywall from "@/components/PremiumPaywall";
const CollegeMap = lazy(() => import("@/components/CollegeMap"));
const CampusNeighborhood = lazy(() => import("@/components/CampusNeighborhood"));

type SavedCollege = {
  id: string;
  college_name: string;
  college_data: College;
  status: string;
  notes: string;
};

const fitCategoryConfig: Record<string, { color: string; bg: string; icon: typeof Target }> = {
  Reach: { color: "text-orange-600", bg: "bg-orange-50", icon: TrendingUp },
  Match: { color: "text-primary", bg: "bg-primary/5", icon: Target },
  Safety: { color: "text-emerald-600", bg: "bg-emerald-50", icon: Shield },
};

const Dashboard = () => {
  const { user, loading: authLoading, signOut, isSubscribed, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [colleges, setColleges] = useState<College[]>([]);
  const [suggestedColleges, setSuggestedColleges] = useState<College[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [studentProfile, setStudentProfile] = useState<{ summary: string; topPriorities: string[]; idealSchoolType: string } | null>(null);
  const [savedColleges, setSavedColleges] = useState<SavedCollege[]>([]);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [storedPreferences, setStoredPreferences] = useState<Record<string, any> | null>(null);
  const [addCollegeName, setAddCollegeName] = useState("");
  const [addingCollege, setAddingCollege] = useState(false);
  const [notesPanelId, setNotesPanelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("matches");
  const [mapSelectedCollege, setMapSelectedCollege] = useState<College | null>(null);

  const notesPanelCollege = savedColleges.find(s => s.id === notesPanelId);

  const saveStructuredNotes = useCallback(async (id: string, structured: StructuredNotes) => {
    const json = JSON.stringify(structured);
    await supabase.from("saved_colleges").update({ notes: json }).eq("id", id);
    setSavedColleges(prev => prev.map(s => s.id === id ? { ...s, notes: json } : s));
  }, []);

  const addCustomCollege = async () => {
    const name = addCollegeName.trim();
    if (!name || !user) return;
    if (name.length > 200) {
      toast({ title: "Name too long", description: "Please enter a shorter college name.", variant: "destructive" });
      return;
    }
    if (savedColleges.find(s => s.college_name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Already saved", description: `${name} is already in your list.` });
      return;
    }
    setAddingCollege(true);
    try {
      // Use AI to populate college data
      const { data: aiData, error: aiError } = await supabase.functions.invoke("college-lookup", {
        body: { collegeName: name },
      });
      if (aiError) throw new Error(aiError.message);
      if (aiData?.error) throw new Error(aiData.error);

      const collegeData: College = aiData?.college || {
        name, location: "—", acceptanceRate: "—", ranking: "—",
        tuitionInState: "—", tuitionOutOfState: "—", avgFinancialAid: "—",
        netPrice: "—", topPrograms: [], campusSize: "—", studentBody: "—",
        studentFacultyRatio: "—", setting: "—", graduationRate: "—",
        avgStartingSalary: "—", fitScore: 0, fitCategory: "Match" as const,
        whyFit: "Added by you.", prosForStudent: [], consForStudent: [],
        challengesForStudent: [], howToGetIn: "—", campusVibe: "—", notableFeature: "—",
      };

      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        college_name: collegeData.name || name,
        college_data: collegeData,
      };
      const { data, error } = await supabase
        .from("saved_colleges")
        .insert(insertPayload as any)
        .select()
        .single();
      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
      } else if (data) {
        setSavedColleges(prev => [{ ...data, college_data: data.college_data as unknown as College, notes: data.notes || "" }, ...prev]);
        toast({ title: "College added!", description: `${collegeData.name || name} has been added with full details.` });
        setAddCollegeName("");
      }
    } catch (err) {
      toast({
        title: "Couldn't look up college",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
    setAddingCollege(false);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Refresh subscription after checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      refreshSubscription();
      // Clean URL
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [refreshSubscription]);

  // Load profile name
  useEffect(() => {
    if (!user) return;
    const name = user.user_metadata?.first_name || user.email?.split("@")[0] || "Student";
    setFirstName(name);
    // Load home address from profile
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data && (data as any).home_address) {
        setHomeAddress((data as any).home_address);
      }
    })();
  }, [user]);

  // Load college matches
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("college_matches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const match = data[0];
        const collegeData = match.college_data as unknown;
        if (Array.isArray(collegeData)) {
          setColleges(collegeData as College[]);
        }
        const profile = match.student_profile as unknown;
        if (profile && typeof profile === "object") {
          setStudentProfile(profile as { summary: string; topPriorities: string[]; idealSchoolType: string });
        }
      }
      setLoadingMatches(false);
    };
    load();
  }, [user]);

  // Load stored survey preferences from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("latest_survey_preferences");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.responses) setStoredPreferences(parsed.responses);
      }
    } catch { /* ignore */ }
  }, []);

  // Load saved colleges
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("saved_colleges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setSavedColleges(data.map(d => ({
          ...d,
          college_data: d.college_data as unknown as College,
          notes: d.notes || "",
        })));
      }
      setLoadingSaved(false);
    };
    load();
  }, [user]);

  const saveCollege = async (college: College) => {
    if (!user) return;
    if (savedColleges.find(s => s.college_name === college.name)) {
      toast({ title: "Already saved", description: `${college.name} is in your list.` });
      return;
    }
    const insertPayload: Record<string, unknown> = { user_id: user.id, college_name: college.name, college_data: college };
    const { data, error } = await supabase
      .from("saved_colleges")
      .insert(insertPayload as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else if (data) {
      setSavedColleges(prev => [{ ...data, college_data: data.college_data as unknown as College, notes: data.notes || "" }, ...prev]);
      toast({ title: "Saved!", description: `${college.name} added to your list.` });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("saved_colleges").update({ status }).eq("id", id);
    setSavedColleges(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateNotes = async (id: string, notes: string) => {
    await supabase.from("saved_colleges").update({ notes }).eq("id", id);
    setSavedColleges(prev => prev.map(s => s.id === id ? { ...s, notes } : s));
  };

  const removeCollege = async (id: string) => {
    await supabase.from("saved_colleges").delete().eq("id", id);
    setSavedColleges(prev => prev.filter(s => s.id !== id));
    toast({ title: "Removed from saved list" });
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      else toast({ title: "Max 4 colleges", description: "Remove one to add another." });
      return next;
    });
  };

  const comparedColleges = useMemo(
    () => savedColleges.filter(s => compareIds.has(s.id)),
    [savedColleges, compareIds]
  );

  // AI Insights
  const insights = useMemo(() => {
    if (colleges.length === 0) return null;
    const bestMatch = [...colleges].sort((a, b) => b.fitScore - a.fitScore)[0];
    const mostAffordable = [...colleges].sort((a, b) => {
      const priceA = parseInt(a.netPrice.replace(/[^0-9]/g, "")) || 999999;
      const priceB = parseInt(b.netPrice.replace(/[^0-9]/g, "")) || 999999;
      return priceA - priceB;
    })[0];
    const safetySchools = colleges.filter(c => c.fitCategory === "Safety");
    return { bestMatch, mostAffordable, safetySchool: safetySchools[0] };
  }, [colleges]);

  const allKnownCollegeNames = useMemo(() => {
    const names = colleges.map(c => c.name);
    const savedNames = savedColleges.map(s => s.college_name);
    const suggestedNames = suggestedColleges.map(c => c.name);
    return [...new Set([...names, ...savedNames, ...suggestedNames])];
  }, [colleges, savedColleges, suggestedColleges]);

  const discoverSuggestions = async () => {
    if (!storedPreferences || loadingSuggestions) return;
    setLoadingSuggestions(true);
    const clean = (val: string | undefined, fallback: string): string => {
      if (!val) return fallback;
      const trimmed = val.trim();
      if (!trimmed || /^\{.*\}$/.test(trimmed)) return fallback;
      return trimmed;
    };
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        const v = storedPreferences[key];
        if (typeof v === "string" && v.trim()) return v;
      }
      return "";
    };
    const preferences = {
      firstName: pick("first_name", "firstName"),
      cityState: clean(pick("city_state", "cityState"), "No preference"),
      gpa: clean(pick("gpa"), ""),
      testScore: clean(pick("test_score", "testScore"), "None"),
      satScore: clean(pick("sat_score", "satScore"), ""),
      actScore: clean(pick("act_score", "actScore"), ""),
      campusSize: clean(pick("campus_size", "campusSize"), "No preference"),
      campusVibe: clean(pick("campus_vibe", "campusVibe"), "No preference"),
      locationType: clean(pick("location_type", "locationType"), "No preference"),
      maxCost: clean(pick("max_cost", "maxCost"), "No preference"),
      acceptanceRatePref: clean(pick("acceptance_rate_pref", "acceptanceRatePref"), "No preference"),
      financialAid: clean(pick("financial_aid", "financialAid"), "Important"),
      campusLife: clean(pick("campus_life", "campusLife"), "No preference"),
      academicImportance: clean(pick("academic_importance", "academicImportance"), "No preference"),
      distanceFromHome: clean(pick("distance_from_home", "distanceFromHome"), "No preference"),
      areaOfStudy: clean(pick("area_of_study", "areaOfStudy"), "Undecided"),
      allResponses: storedPreferences,
    };
    try {
      const { data, error } = await supabase.functions.invoke("college-match", {
        body: { preferences, excludeColleges: allKnownCollegeNames },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.colleges) {
        setSuggestedColleges(prev => [...prev, ...data.colleges]);
        toast({ title: "New suggestions found!", description: `${data.colleges.length} new colleges to explore.` });
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to get suggestions", variant: "destructive" });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container px-4 pt-24 pb-16 max-w-7xl mx-auto">
        {/* 1. Welcome Section */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={0} className="mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary mb-1">Dashboard</p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground text-lg">
                Organize, compare, and plan your college journey — all in one place.
              </p>
            </div>
          </div>
          {studentProfile && (
            <Card className="mt-6 bg-card border-border shadow-soft overflow-hidden">
              <div className="h-1 bg-primary/20 w-full">
                <div className="h-full bg-primary rounded-r-full" style={{ width: '100%' }} />
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground mb-1">Your Student Profile</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{studentProfile.summary}</p>
                    {studentProfile.idealSchoolType && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="font-semibold text-foreground">Ideal school type:</span> {studentProfile.idealSchoolType}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {studentProfile.topPriorities?.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-medium">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add College Bar */}
          {isSubscribed ? (
            <Card className="bg-card border-border shadow-soft">
              <CardContent className="p-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); addCustomCollege(); }}
                  className="flex items-center gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Add a college — AI will fill in all the details..."
                      value={addCollegeName}
                      onChange={(e) => setAddCollegeName(e.target.value)}
                      className="pl-10 bg-muted/30 border-border/50 focus:bg-card"
                      maxLength={200}
                    />
                  </div>
                  <Button type="submit" disabled={!addCollegeName.trim() || addingCollege} size="default" className="shrink-0 gap-1.5">
                    {addingCollege ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-soft relative overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3 opacity-60">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Add a college — AI will fill in all the details..."
                    disabled
                    className="pl-10 bg-muted/30 border-border/50"
                  />
                </div>
                <Button disabled size="default" className="shrink-0 gap-1.5">
                  <Lock className="h-4 w-4" /> Premium
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            <TabsTrigger value="matches" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><GraduationCap className="h-4 w-4" /> Matches</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><Bookmark className="h-4 w-4" /> Saved</TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><BarChart3 className="h-4 w-4" /> Compare {!isSubscribed && <Lock className="h-3 w-3 text-muted-foreground" />}</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><StickyNote className="h-4 w-4" /> Notes {!isSubscribed && <Lock className="h-3 w-3 text-muted-foreground" />}</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><Sparkles className="h-4 w-4" /> Insights {!isSubscribed && <Lock className="h-3 w-3 text-muted-foreground" />}</TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><MapPin className="h-4 w-4" /> Map {!isSubscribed && <Lock className="h-3 w-3 text-muted-foreground" />}</TabsTrigger>
          </TabsList>

          {/* 2. College Matches */}
          <TabsContent value="matches">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Your College Matches</h2>
              </div>
              {loadingMatches ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : colleges.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No matches yet</h3>
                    <p className="text-muted-foreground mb-4">Take the college quiz to get your personalized recommendations.</p>
                    <Button onClick={() => navigate("/survey")}>Take the Quiz</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {colleges.map((college, i) => {
                      const cat = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
                      const CatIcon = cat.icon;
                      const isSaved = savedColleges.some(s => s.college_name === college.name);
                      return (
                        <motion.div key={college.name} variants={fadeIn} custom={i + 1}>
                          <Card className="bg-card border-border hover:shadow-card transition-shadow h-full flex flex-col">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg leading-tight">{college.name}</CardTitle>
                                <Badge className={`${cat.bg} ${cat.color} border-0 shrink-0`}>
                                  <CatIcon className="h-3 w-3 mr-1" />{college.fitCategory}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />{college.location}
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4">
                              <div className="flex items-center gap-2">
                                <div className="text-3xl font-bold text-primary">{college.fitScore}%</div>
                                <span className="text-xs text-muted-foreground">match</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Target className="h-3.5 w-3.5" />
                                  <span>{college.acceptanceRate}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  <span>{college.netPrice}</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{college.whyFit}</p>
                              <div className="mt-auto pt-3">
                                <Button
                                  variant={isSaved ? "secondary" : "default"}
                                  size="sm"
                                  className="w-full"
                                  onClick={() => saveCollege(college)}
                                  disabled={isSaved}
                                >
                                  {isSaved ? <><Bookmark className="h-4 w-4 mr-1" /> Saved</> : <><BookmarkPlus className="h-4 w-4 mr-1" /> Save College</>}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Suggested Colleges */}
                  {suggestedColleges.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 mt-10 mb-6">
                        <Sparkles className="h-5 w-5 text-accent" />
                        <h3 className="text-xl font-bold text-foreground">More Suggestions</h3>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {suggestedColleges.map((college, i) => {
                          const cat = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
                          const CatIcon = cat.icon;
                          const isSaved = savedColleges.some(s => s.college_name === college.name);
                          return (
                            <motion.div key={college.name} variants={fadeIn} custom={i + 1}>
                              <Card className="bg-card border-border hover:shadow-card transition-shadow h-full flex flex-col">
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg leading-tight">{college.name}</CardTitle>
                                    <Badge className={`${cat.bg} ${cat.color} border-0 shrink-0`}>
                                      <CatIcon className="h-3 w-3 mr-1" />{college.fitCategory}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" />{college.location}
                                  </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="text-3xl font-bold text-primary">{college.fitScore}%</div>
                                    <span className="text-xs text-muted-foreground">match</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed">{college.whyFit}</p>
                                  <div className="mt-auto pt-3">
                                    <Button
                                      variant={isSaved ? "secondary" : "default"}
                                      size="sm"
                                      className="w-full"
                                      onClick={() => saveCollege(college)}
                                      disabled={isSaved}
                                    >
                                      {isSaved ? <><Bookmark className="h-4 w-4 mr-1" /> Saved</> : <><BookmarkPlus className="h-4 w-4 mr-1" /> Save College</>}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Discover More Button */}
                  {storedPreferences && (
                    <div className="text-center mt-8">
                      <Button
                        onClick={discoverSuggestions}
                        disabled={loadingSuggestions}
                        variant="outline"
                        className="rounded-full px-8 gap-2 border-primary/30 hover:bg-primary/5 hover:border-primary/50 text-primary font-semibold"
                      >
                        {loadingSuggestions ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Finding suggestions...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Discover More Colleges</>
                        )}
                      </Button>
                      <p className="text-muted-foreground text-xs mt-2">Get 5 more AI-suggested colleges based on your quiz</p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </TabsContent>

          {/* 4. Saved Colleges Organizer */}
          <TabsContent value="saved">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bookmark className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Saved Colleges</h2>
                  <p className="text-sm text-muted-foreground">Track your application progress for each school.</p>
                </div>
              </div>
              {loadingSaved ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : savedColleges.length === 0 ? (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Bookmark className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No saved colleges yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">Save colleges from the Matches tab to organize and track them here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {savedColleges.map(saved => {
                    const cat = fitCategoryConfig[saved.college_data.fitCategory] || fitCategoryConfig.Match;
                    const CatIcon = cat.icon;
                    const statusColors: Record<string, string> = {
                      Considering: "bg-muted text-muted-foreground",
                      Applying: "bg-primary/10 text-primary",
                      Applied: "bg-accent/10 text-accent",
                      Accepted: "bg-emerald-50 text-emerald-600",
                    };
                    return (
                      <Collapsible key={saved.id}>
                        <Card className="bg-card border-border hover:shadow-soft transition-all duration-200 overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                              <CollapsibleTrigger className="flex-1 min-w-0 text-left cursor-pointer group">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{saved.college_name}</h3>
                                  <Badge className={`${cat.bg} ${cat.color} border-0 text-[10px] shrink-0`}>
                                    <CatIcon className="h-3 w-3 mr-0.5" />{saved.college_data.fitCategory}
                                  </Badge>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{saved.college_data.location}</span>
                                  <span className="font-semibold text-primary">{saved.college_data.fitScore}% match</span>
                                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{saved.college_data.netPrice}</span>
                                  <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{saved.college_data.acceptanceRate}</span>
                                </div>
                              </CollapsibleTrigger>
                              <div className="flex items-center gap-2 shrink-0">
                                <Select value={saved.status} onValueChange={(val) => updateStatus(saved.id, val)}>
                                  <SelectTrigger className={`h-8 text-xs w-[130px] border-0 font-medium ${statusColors[saved.status] || ""}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Considering">Considering</SelectItem>
                                    <SelectItem value="Applying">Applying</SelectItem>
                                    <SelectItem value="Applied">Applied</SelectItem>
                                    <SelectItem value="Accepted">Accepted</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeCollege(saved.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <CollapsibleContent>
                              <div className="border-t border-border bg-muted/20 p-5">
                                {/* Premium Details Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                  {[
                                    { label: "In-State Tuition", value: saved.college_data.tuitionInState, icon: DollarSign },
                                    { label: "Out-of-State Tuition", value: saved.college_data.tuitionOutOfState, icon: DollarSign },
                                    { label: "Financial Aid", value: saved.college_data.avgFinancialAid, icon: Wallet },
                                    { label: "Graduation Rate", value: saved.college_data.graduationRate, icon: Award },
                                    { label: "Student Body", value: saved.college_data.studentBody, icon: Users },
                                    { label: "Student:Faculty", value: saved.college_data.studentFacultyRatio, icon: BookOpen },
                                    { label: "Campus Size", value: saved.college_data.campusSize, icon: MapPin },
                                    { label: "Avg Starting Salary", value: saved.college_data.avgStartingSalary, icon: Briefcase },
                                  ].map(item => {
                                    const Icon = item.icon;
                                    return (
                                      <div key={item.label} className="bg-card rounded-lg p-3 border border-border/50">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                          <Icon className="h-3 w-3" />{item.label}
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">{item.value || "—"}</p>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Why It Fits + Campus Vibe + Notable Feature */}
                                <div className="grid md:grid-cols-3 gap-4 mb-5">
                                  <div className="bg-card rounded-lg p-4 border border-border/50">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Why It's a Good Fit</p>
                                    <p className="text-sm text-foreground">{saved.college_data.whyFit || "—"}</p>
                                  </div>
                                  <div className="bg-card rounded-lg p-4 border border-border/50">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Campus Vibe</p>
                                    <p className="text-sm text-foreground">{saved.college_data.campusVibe || "—"}</p>
                                  </div>
                                  <div className="bg-card rounded-lg p-4 border border-border/50">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Notable Feature</p>
                                    <p className="text-sm text-foreground">{saved.college_data.notableFeature || "—"}</p>
                                  </div>
                                </div>

                                {/* Top Programs */}
                                {saved.college_data.topPrograms?.length > 0 && (
                                  <div className="mb-5">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Top Programs</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {saved.college_data.topPrograms.map((prog, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{prog}</Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Pros / Cons / How to Get In */}
                                <div className="grid md:grid-cols-3 gap-4">
                                  {saved.college_data.prosForStudent?.length > 0 && (
                                    <div className="bg-secondary/50 rounded-lg p-4 border border-border/50">
                                      <p className="text-xs font-semibold text-foreground mb-2">✓ Pros</p>
                                      <ul className="space-y-1">
                                        {saved.college_data.prosForStudent.map((pro, i) => (
                                          <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                                            <span className="text-primary mt-0.5">•</span>{pro}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {saved.college_data.consForStudent?.length > 0 && (
                                    <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/10">
                                      <p className="text-xs font-semibold text-foreground mb-2">✗ Cons</p>
                                      <ul className="space-y-1">
                                        {saved.college_data.consForStudent.map((con, i) => (
                                          <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                                            <span className="text-destructive mt-0.5">•</span>{con}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {saved.college_data.howToGetIn && saved.college_data.howToGetIn !== "—" && (
                                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                                      <p className="text-xs font-semibold text-primary mb-2">How to Get In</p>
                                      <p className="text-sm text-foreground">{saved.college_data.howToGetIn}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </CardContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* 5. Compare Colleges (Premium) */}
          <TabsContent value="compare">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              {isSubscribed ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Compare Colleges</h2>
                      <p className="text-sm text-muted-foreground">Select up to 4 colleges for a visual side-by-side comparison.</p>
                    </div>
                  </div>
                  <CollegeComparison
                    savedColleges={savedColleges}
                    comparedColleges={comparedColleges}
                    compareIds={compareIds}
                    onToggleCompare={toggleCompare}
                    onOpenNotes={(id) => { setNotesPanelId(id); }}
                    onSwitchToMap={() => setActiveTab("map")}
                  />
                </>
              ) : <PremiumPaywall />}
            </motion.div>
          </TabsContent>

          {/* 6. Personal Notes (Premium) */}
          <TabsContent value="notes">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              {isSubscribed ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10"><StickyNote className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Personal Notes</h2>
                      <p className="text-sm text-muted-foreground">Click any college to open your structured notes workspace.</p>
                    </div>
                  </div>
                  {savedColleges.length === 0 ? (
                    <Card className="bg-card border-border"><CardContent className="p-10 text-center">
                      <p className="text-muted-foreground">Save some colleges first to add notes.</p>
                    </CardContent></Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {savedColleges.map(saved => {
                        const parsed = parseNotes(saved.notes);
                        const hasTags = parsed.tags.length > 0;
                        const hasNotes = parsed.general.trim().length > 0;
                        const prosCount = parsed.pros.filter(p => p.trim()).length;
                        const consCount = parsed.cons.filter(c => c.trim()).length;
                        const checkDone = Object.values(parsed.checklist).filter(Boolean).length;
                        return (
                          <Card
                            key={saved.id}
                            className="bg-card border-border hover:shadow-card hover:border-primary/20 transition-all cursor-pointer group"
                            onClick={() => setNotesPanelId(saved.id)}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{saved.college_name}</h3>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{saved.college_data.location}</span>
                                  </div>
                                </div>
                                <StickyNote className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                              </div>
                              {hasTags && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {parsed.tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">{tag}</Badge>
                                  ))}
                                  {parsed.tags.length > 3 && (
                                    <Badge variant="secondary" className="text-[10px] px-2 py-0">+{parsed.tags.length - 3}</Badge>
                                  )}
                                </div>
                              )}
                              {hasNotes && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{parsed.general}</p>
                              )}
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                {prosCount > 0 && <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5 text-emerald-600" /> {prosCount}</span>}
                                {consCount > 0 && <span className="flex items-center gap-0.5"><ThumbsDown className="h-2.5 w-2.5 text-rose-500" /> {consCount}</span>}
                                {checkDone > 0 && <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {checkDone}/4</span>}
                                {!hasTags && !hasNotes && prosCount === 0 && consCount === 0 && (
                                  <span className="text-muted-foreground/60 italic">No notes yet — click to add</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : <PremiumPaywall />}
            </motion.div>
          </TabsContent>

          {/* 7. AI Insights (Premium) */}
          <TabsContent value="insights">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              {isSubscribed ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Decision Insights</h2>
                      <p className="text-sm text-muted-foreground">Personalized analysis to help you decide — not just describe.</p>
                    </div>
                  </div>
                  {colleges.length === 0 ? (
                    <Card className="bg-card border-border"><CardContent className="p-10 text-center">
                      <p className="text-muted-foreground">Take the quiz to get decision-focused insights.</p>
                    </CardContent></Card>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      {insights && (
                        <div className="grid gap-4 md:grid-cols-3 mb-2">
                          {insights.bestMatch && (
                            <Card className="bg-card border-border">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10"><Trophy className="h-5 w-5 text-primary" /></div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Best Overall Match</p>
                                  <p className="text-sm font-bold text-foreground">{insights.bestMatch.name}</p>
                                  <p className="text-xs text-primary font-semibold">{insights.bestMatch.fitScore}% fit</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {insights.mostAffordable && (
                            <Card className="bg-card border-border">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-50"><Wallet className="h-5 w-5 text-emerald-600" /></div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Most Affordable</p>
                                  <p className="text-sm font-bold text-foreground">{insights.mostAffordable.name}</p>
                                  <p className="text-xs text-emerald-600 font-semibold">{insights.mostAffordable.netPrice}</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {insights.safetySchool && (
                            <Card className="bg-card border-border">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-accent/10"><Shield className="h-5 w-5 text-accent" /></div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">Top Safety School</p>
                                  <p className="text-sm font-bold text-foreground">{insights.safetySchool.name}</p>
                                  <p className="text-xs text-accent font-semibold">{insights.safetySchool.fitScore}% fit</p>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}

                      {/* Per-College Decision Cards */}
                      {colleges.map((college, idx) => {
                        const cat = fitCategoryConfig[college.fitCategory] || fitCategoryConfig.Match;
                        const CatIcon = cat.icon;
                        const isSaved = savedColleges.some(s => s.college_name === college.name);
                        const savedEntry = savedColleges.find(s => s.college_name === college.name);

                        // Compute fit breakdown dimensions from college data
                        const parseRate = (s: string) => { const n = parseFloat(s?.replace(/[^0-9.]/g, "") || "0"); return isNaN(n) ? 0 : n; };
                        const academicsScore = Math.min(100, Math.round(
                          (parseRate(college.graduationRate) > 0 ? parseRate(college.graduationRate) : 50) * 0.5 +
                          (college.topPrograms?.length > 0 ? Math.min(college.topPrograms.length * 15, 50) : 25)
                        ));
                        const costScore = Math.min(100, Math.round(
                          college.netPrice ? Math.max(0, 100 - (parseInt(college.netPrice.replace(/[^0-9]/g, "")) || 50000) / 600) : 50
                        ));
                        const distanceScore = college.fitScore >= 80 ? 85 : college.fitScore >= 60 ? 70 : 55;
                        const campusSizeScore = college.fitScore >= 70 ? 80 : 60;
                        const lifestyleScore = Math.min(100, Math.round(college.fitScore * 0.9 + (college.campusVibe && college.campusVibe !== "—" ? 10 : 0)));

                        const fitDimensions = [
                          { label: "Academics", score: academicsScore, icon: BookOpen },
                          { label: "Cost", score: costScore, icon: DollarSign },
                          { label: "Distance", score: distanceScore, icon: Navigation },
                          { label: "Campus Size", score: campusSizeScore, icon: Users },
                          { label: "Lifestyle Fit", score: lifestyleScore, icon: Heart },
                        ];

                        // Build personalized "Why this fits you" reasons from quiz prefs + college data
                        const whyReasons: string[] = [];
                        if (college.prosForStudent?.length > 0) whyReasons.push(college.prosForStudent[0]);
                        if (college.whyFit && college.whyFit !== "—") {
                          const sentences = college.whyFit.split(/\.\s+/);
                          if (sentences.length > 1) whyReasons.push(sentences[1].replace(/\.$/, "") + ".");
                          else if (whyReasons.length === 0) whyReasons.push(college.whyFit);
                        }
                        if (storedPreferences) {
                          const area = storedPreferences["area_of_study"] || storedPreferences["areaOfStudy"];
                          if (area && college.topPrograms?.some(p => p.toLowerCase().includes(area.toLowerCase().split(" ")[0]))) {
                            whyReasons.push(`Offers strong programs in ${area}, which matches your intended area of study.`);
                          }
                        }
                        if (college.notableFeature && college.notableFeature !== "—" && whyReasons.length < 3) {
                          whyReasons.push(college.notableFeature);
                        }

                        // "What to watch out for"
                        const watchOuts: string[] = [];
                        if (college.consForStudent?.length > 0) watchOuts.push(...college.consForStudent.slice(0, 2));
                        if (college.challengesForStudent?.length > 0 && watchOuts.length < 2) {
                          watchOuts.push(...college.challengesForStudent.slice(0, 2 - watchOuts.length));
                        }
                        if (watchOuts.length === 0) watchOuts.push("No major concerns identified based on your preferences.");

                        const scoreColor = (s: number) => s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-500" : "text-destructive";
                        const barColor = (s: number) => s >= 75 ? "bg-emerald-500" : s >= 50 ? "bg-amber-400" : "bg-destructive";

                        return (
                          <motion.div key={college.name} variants={fadeIn} custom={idx + 1}>
                            <Card className="bg-card border-border overflow-hidden">
                              <CardContent className="p-0">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 pb-4 border-b border-border/50">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="text-lg font-bold text-foreground truncate">{college.name}</h3>
                                      <Badge className={`${cat.bg} ${cat.color} border-0 shrink-0 text-xs`}>
                                        <CatIcon className="h-3 w-3 mr-0.5" />{college.fitCategory}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{college.location}</span>
                                      <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{college.acceptanceRate}</span>
                                      <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{college.netPrice}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-center">
                                      <div className="text-3xl font-bold text-primary leading-none">{college.fitScore}%</div>
                                      <p className="text-[10px] font-medium text-muted-foreground mt-0.5">FIT SCORE</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Fit Breakdown */}
                                <div className="p-5 grid md:grid-cols-2 gap-6">
                                  <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Fit Breakdown</p>
                                    <div className="space-y-3">
                                      {fitDimensions.map(dim => (
                                        <div key={dim.label} className="flex items-center gap-3">
                                          <dim.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-xs font-medium text-foreground">{dim.label}</span>
                                              <span className={`text-xs font-bold ${scoreColor(dim.score)}`}>{dim.score}%</span>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                              <div className={`h-full rounded-full transition-all duration-500 ${barColor(dim.score)}`} style={{ width: `${dim.score}%` }} />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-5">
                                    {/* Why this fits you */}
                                    <div>
                                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" /> Why This Fits You
                                      </p>
                                      <ul className="space-y-1.5">
                                        {whyReasons.slice(0, 3).map((reason, i) => (
                                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                                            <span>{reason}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    {/* What to watch out for */}
                                    <div>
                                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Eye className="h-3.5 w-3.5 text-amber-500" /> What to Watch Out For
                                      </p>
                                      <ul className="space-y-1.5">
                                        {watchOuts.slice(0, 2).map((item, i) => (
                                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>

                                {/* Next Steps */}
                                <div className="border-t border-border/50 bg-muted/20 px-5 py-3 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground mr-1">Next step:</span>
                                  {!isSaved ? (
                                    <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => saveCollege(college)}>
                                      <BookmarkPlus className="h-3.5 w-3.5" /> Save This School
                                    </Button>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs gap-1"><Bookmark className="h-3 w-3" /> Saved</Badge>
                                  )}
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                                    if (savedEntry) { toggleCompare(savedEntry.id); setActiveTab("compare"); }
                                    else { saveCollege(college).then(() => { toast({ title: "Saved! Head to Compare tab." }); setActiveTab("compare"); }); }
                                  }}>
                                    <BarChart3 className="h-3.5 w-3.5" /> Compare
                                  </Button>
                                  {savedEntry && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setNotesPanelId(savedEntry.id); }}>
                                      <StickyNote className="h-3.5 w-3.5" /> Add a Note
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : <PremiumPaywall />}
            </motion.div>
          </TabsContent>

          {/* Map Tab (Premium) */}
          <TabsContent value="map">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              {isSubscribed ? (
                <div className="space-y-0">
                  <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                    <CollegeMap
                      matchedColleges={colleges}
                      savedColleges={savedColleges.map(s => ({ college_data: s.college_data, college_name: s.college_name }))}
                      homeAddress={homeAddress}
                      onCollegeSelect={(c) => setMapSelectedCollege(prev => prev?.name === c.name ? null : c)}
                      selectedCollege={mapSelectedCollege?.name || null}
                    />
                  </Suspense>
                  <AnimatePresence>
                    {mapSelectedCollege && (
                      <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
                        <CampusNeighborhood
                          key={mapSelectedCollege.name}
                          college={mapSelectedCollege}
                          onClose={() => setMapSelectedCollege(null)}
                        />
                      </Suspense>
                    )}
                  </AnimatePresence>
                </div>
              ) : <PremiumPaywall />}
            </motion.div>
          </TabsContent>

        </Tabs>
      </main>

      {/* Notes slide-out panel */}
      {notesPanelCollege && (
        <CollegeNotesPanel
          open={!!notesPanelId}
          onClose={() => setNotesPanelId(null)}
          college={notesPanelCollege.college_data}
          collegeName={notesPanelCollege.college_name}
          notes={parseNotes(notesPanelCollege.notes)}
          onSave={(structured) => saveStructuredNotes(notesPanelCollege.id, structured)}
        />
      )}
    </div>
  );
};

export default Dashboard;

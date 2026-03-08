import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import {
  GraduationCap, Star, BookmarkPlus, Bookmark, BarChart3, StickyNote,
  Sparkles, MapPin, DollarSign, Target, Shield, TrendingUp,
  LogOut, Trophy, Navigation, Wallet, Loader2, Trash2
} from "lucide-react";
import type { College } from "@/types/college";

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
  const { user, loading: authLoading, signOut } = useAuth();
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
  const [storedPreferences, setStoredPreferences] = useState<Record<string, any> | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Load profile name
  useEffect(() => {
    if (!user) return;
    const name = user.user_metadata?.first_name || user.email?.split("@")[0] || "Student";
    setFirstName(name);
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
            <Button variant="outline" onClick={signOut} className="text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
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
        </motion.section>

        <Tabs defaultValue="matches" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
            <TabsTrigger value="matches" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><GraduationCap className="h-4 w-4" /> Matches</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><Bookmark className="h-4 w-4" /> Saved</TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><BarChart3 className="h-4 w-4" /> Compare</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><StickyNote className="h-4 w-4" /> Notes</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:shadow-soft"><Sparkles className="h-4 w-4" /> Insights</TabsTrigger>
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
                      <Card key={saved.id} className="bg-card border-border hover:shadow-soft transition-all duration-200">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-foreground truncate">{saved.college_name}</h3>
                                <Badge className={`${cat.bg} ${cat.color} border-0 text-[10px] shrink-0`}>
                                  <CatIcon className="h-3 w-3 mr-0.5" />{saved.college_data.fitCategory}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{saved.college_data.location}</span>
                                <span className="font-semibold text-primary">{saved.college_data.fitScore}% match</span>
                                <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{saved.college_data.netPrice}</span>
                                <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" />{saved.college_data.acceptanceRate}</span>
                              </div>
                            </div>
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* 5. Compare Colleges */}
          <TabsContent value="compare">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Compare Colleges</h2>
                  <p className="text-muted-foreground text-sm">Select up to 4 saved colleges to compare side-by-side.</p>
                </div>
              </div>

              {savedColleges.length === 0 ? (
                <Card className="bg-card border-border mt-6">
                  <CardContent className="p-10 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Save some colleges first to compare them.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mt-6 mb-8">
                    {savedColleges.map(s => {
                      const isSelected = compareIds.has(s.id);
                      const cat = fitCategoryConfig[s.college_data.fitCategory] || fitCategoryConfig.Match;
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-soft"
                              : "bg-card border-border hover:border-primary/30 hover:shadow-soft"
                          }`}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleCompare(s.id)} />
                          <span className="text-sm font-medium text-foreground">{s.college_name}</span>
                          <Badge className={`${cat.bg} ${cat.color} border-0 text-[10px] px-1.5 py-0`}>
                            {s.college_data.fitScore}%
                          </Badge>
                        </label>
                      );
                    })}
                  </div>

                  {comparedColleges.length >= 2 && (
                    <div className="space-y-0">
                      {/* College Header Cards */}
                      <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `repeat(${comparedColleges.length}, minmax(0, 1fr))` }}>
                        {comparedColleges.map(c => {
                          const cat = fitCategoryConfig[c.college_data.fitCategory] || fitCategoryConfig.Match;
                          const CatIcon = cat.icon;
                          return (
                            <Card key={c.id} className="bg-card border-border overflow-hidden">
                              <div className="h-1.5 bg-primary w-full" style={{ opacity: c.college_data.fitScore / 100 }} />
                              <CardContent className="p-5 text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                                  <GraduationCap className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{c.college_name}</h3>
                                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-3">
                                  <MapPin className="h-3 w-3" />{c.college_data.location}
                                </div>
                                <div className="text-2xl font-bold text-primary mb-1">{c.college_data.fitScore}%</div>
                                <Badge className={`${cat.bg} ${cat.color} border-0 text-xs`}>
                                  <CatIcon className="h-3 w-3 mr-1" />{c.college_data.fitCategory}
                                </Badge>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Comparison Rows */}
                      <div className="rounded-xl border border-border overflow-hidden bg-card">
                        {[
                          { label: "Acceptance Rate", icon: Target, key: (c: College) => c.acceptanceRate },
                          { label: "Net Price", icon: DollarSign, key: (c: College) => c.netPrice },
                          { label: "Student Body", icon: GraduationCap, key: (c: College) => c.studentBody },
                          { label: "Setting", icon: MapPin, key: (c: College) => c.setting },
                          { label: "Graduation Rate", icon: Trophy, key: (c: College) => c.graduationRate },
                          { label: "Avg Starting Salary", icon: Wallet, key: (c: College) => c.avgStartingSalary },
                          { label: "Top Programs", icon: Star, key: (c: College) => c.topPrograms?.join(", ") || "—" },
                          { label: "Campus Vibe", icon: Navigation, key: (c: College) => c.campusVibe },
                        ].map((row, idx) => {
                          const RowIcon = row.icon;
                          return (
                            <div
                              key={row.label}
                              className={`grid items-center gap-4 px-5 py-4 ${idx % 2 === 0 ? "bg-card" : "bg-muted/30"} ${idx > 0 ? "border-t border-border/50" : ""}`}
                              style={{ gridTemplateColumns: `180px repeat(${comparedColleges.length}, minmax(0, 1fr))` }}
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <RowIcon className="h-4 w-4 shrink-0" />
                                {row.label}
                              </div>
                              {comparedColleges.map(c => (
                                <div key={c.id} className="text-sm font-medium text-foreground">
                                  {row.key(c.college_data)}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {comparedColleges.length < 2 && comparedColleges.length > 0 && (
                    <Card className="bg-card border-border border-dashed">
                      <CardContent className="p-8 text-center">
                        <p className="text-sm text-muted-foreground">Select at least <span className="font-semibold text-foreground">2 colleges</span> to see the comparison.</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </motion.div>
          </TabsContent>

          {/* 6. Personal Notes */}
          <TabsContent value="notes">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <StickyNote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Personal Notes</h2>
                  <p className="text-sm text-muted-foreground">Jot down your thoughts about each school.</p>
                </div>
              </div>
              {savedColleges.length === 0 ? (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <StickyNote className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No notes yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">Save colleges first, then come back to add your notes here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {savedColleges.map(saved => {
                    const cat = fitCategoryConfig[saved.college_data.fitCategory] || fitCategoryConfig.Match;
                    return (
                      <Card key={saved.id} className="bg-card border-border hover:shadow-soft transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2.5">
                              <div className="p-1.5 rounded-lg bg-primary/10">
                                <GraduationCap className="h-4 w-4 text-primary" />
                              </div>
                              <span className="truncate">{saved.college_name}</span>
                            </CardTitle>
                            <Badge className={`${cat.bg} ${cat.color} border-0 text-[10px]`}>{saved.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder="What stands out about this school? What are your concerns?"
                            value={saved.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSavedColleges(prev => prev.map(s => s.id === saved.id ? { ...s, notes: val } : s));
                            }}
                            onBlur={(e) => updateNotes(saved.id, e.target.value)}
                            className="min-h-[120px] text-sm bg-muted/30 border-border/50 focus:bg-card resize-none"
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* 7. AI Insights */}
          <TabsContent value="insights">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">AI Insights</h2>
                  <p className="text-sm text-muted-foreground">Key takeaways from your college matches.</p>
                </div>
              </div>
              {!insights ? (
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No insights yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">Take the quiz to see personalized AI insights about your matches.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    {
                      icon: Trophy,
                      title: "Best Academic Match",
                      name: insights.bestMatch.name,
                      detail: `${insights.bestMatch.fitScore}% match · ${insights.bestMatch.location}`,
                      accent: "primary",
                    },
                    {
                      icon: Wallet,
                      title: "Most Affordable",
                      name: insights.mostAffordable.name,
                      detail: `${insights.mostAffordable.netPrice} net price`,
                      accent: "accent",
                    },
                    ...(insights.safetySchool ? [{
                      icon: Shield,
                      title: "Top Safety School",
                      name: insights.safetySchool.name,
                      detail: `${insights.safetySchool.acceptanceRate} acceptance rate`,
                      accent: "accent" as const,
                    }] : []),
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <motion.div key={item.title} variants={fadeIn} custom={i + 1}>
                        <Card className="bg-card border-border hover:shadow-card transition-all duration-300 h-full overflow-hidden">
                          <div className={`h-1 w-full ${item.accent === "primary" ? "bg-primary" : "bg-accent"}`} style={{ opacity: 0.6 }} />
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`p-2.5 rounded-xl ${item.accent === "primary" ? "bg-primary/10" : "bg-accent/10"}`}>
                                <Icon className={`h-5 w-5 ${item.accent === "primary" ? "text-primary" : "text-accent"}`} />
                              </div>
                              <h3 className="font-semibold text-muted-foreground text-sm">{item.title}</h3>
                            </div>
                            <p className="text-xl font-bold text-foreground mb-1">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.detail}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

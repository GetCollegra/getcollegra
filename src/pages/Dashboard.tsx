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
  const [studentProfile, setStudentProfile] = useState<{ summary: string; topPriorities: string[]; idealSchoolType: string } | null>(null);
  const [savedColleges, setSavedColleges] = useState<SavedCollege[]>([]);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [firstName, setFirstName] = useState("");

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
    const { data, error } = await supabase
      .from("saved_colleges")
      .insert({ user_id: user.id, college_name: college.name, college_data: college as unknown as Record<string, unknown> })
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
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome to Collegra Premium, {firstName}
              </h1>
              <p className="text-muted-foreground text-lg">
                This dashboard helps you organize, compare, and plan your college options.
              </p>
            </div>
            <Button variant="ghost" onClick={signOut} className="text-muted-foreground">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
          {studentProfile && (
            <Card className="mt-6 bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-1 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">Your Student Profile</p>
                    <p className="text-sm text-muted-foreground">{studentProfile.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {studentProfile.topPriorities?.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.section>

        <Tabs defaultValue="matches" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1">
            <TabsTrigger value="matches" className="gap-1.5 text-xs sm:text-sm"><GraduationCap className="h-4 w-4" /> Matches</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 text-xs sm:text-sm"><Bookmark className="h-4 w-4" /> Saved</TabsTrigger>
            <TabsTrigger value="compare" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="h-4 w-4" /> Compare</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm"><StickyNote className="h-4 w-4" /> Notes</TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5 text-xs sm:text-sm"><Sparkles className="h-4 w-4" /> Insights</TabsTrigger>
          </TabsList>

          {/* 2. College Matches */}
          <TabsContent value="matches">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <h2 className="text-2xl font-bold text-foreground mb-6">Your College Matches</h2>
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
              )}
            </motion.div>
          </TabsContent>

          {/* 4. Saved Colleges Organizer */}
          <TabsContent value="saved">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <h2 className="text-2xl font-bold text-foreground mb-6">Saved Colleges</h2>
              {loadingSaved ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : savedColleges.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No saved colleges</h3>
                    <p className="text-muted-foreground">Save colleges from the Matches tab to organize them here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">School</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Tuition</TableHead>
                        <TableHead>Acceptance</TableHead>
                        <TableHead>Setting</TableHead>
                        <TableHead className="min-w-[160px]">Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedColleges.map(saved => (
                        <TableRow key={saved.id}>
                          <TableCell className="font-medium">{saved.college_name}</TableCell>
                          <TableCell><span className="font-semibold text-primary">{saved.college_data.fitScore}%</span></TableCell>
                          <TableCell>{saved.college_data.netPrice}</TableCell>
                          <TableCell>{saved.college_data.acceptanceRate}</TableCell>
                          <TableCell>{saved.college_data.setting}</TableCell>
                          <TableCell>
                            <Select value={saved.status} onValueChange={(val) => updateStatus(saved.id, val)}>
                              <SelectTrigger className="h-8 text-xs w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Considering">Considering</SelectItem>
                                <SelectItem value="Applying">Applying</SelectItem>
                                <SelectItem value="Applied">Applied</SelectItem>
                                <SelectItem value="Accepted">Accepted</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeCollege(saved.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* 5. Compare Colleges */}
          <TabsContent value="compare">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <h2 className="text-2xl font-bold text-foreground mb-2">Compare Colleges</h2>
              <p className="text-muted-foreground mb-6 text-sm">Select up to 4 saved colleges to compare side-by-side.</p>

              {savedColleges.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Save some colleges first to compare them.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {savedColleges.map(s => (
                      <label key={s.id} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-all ${compareIds.has(s.id) ? "bg-primary/5 border-primary" : "bg-card border-border hover:border-primary/40"}`}>
                        <Checkbox checked={compareIds.has(s.id)} onCheckedChange={() => toggleCompare(s.id)} />
                        <span className="text-sm font-medium">{s.college_name}</span>
                      </label>
                    ))}
                  </div>

                  {comparedColleges.length >= 2 && (
                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">Attribute</TableHead>
                            {comparedColleges.map(c => (
                              <TableHead key={c.id} className="min-w-[160px] font-semibold">{c.college_name}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { label: "Match Score", key: (c: College) => `${c.fitScore}%` },
                            { label: "Fit Category", key: (c: College) => c.fitCategory },
                            { label: "Location", key: (c: College) => c.location },
                            { label: "Acceptance Rate", key: (c: College) => c.acceptanceRate },
                            { label: "Net Price", key: (c: College) => c.netPrice },
                            { label: "Student Body", key: (c: College) => c.studentBody },
                            { label: "Setting", key: (c: College) => c.setting },
                            { label: "Top Programs", key: (c: College) => c.topPrograms?.join(", ") || "—" },
                            { label: "Campus Vibe", key: (c: College) => c.campusVibe },
                          ].map(row => (
                            <TableRow key={row.label}>
                              <TableCell className="font-medium text-muted-foreground">{row.label}</TableCell>
                              {comparedColleges.map(c => (
                                <TableCell key={c.id}>{row.key(c.college_data)}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {comparedColleges.length < 2 && comparedColleges.length > 0 && (
                    <p className="text-sm text-muted-foreground">Select at least 2 colleges to compare.</p>
                  )}
                </>
              )}
            </motion.div>
          </TabsContent>

          {/* 6. Personal Notes */}
          <TabsContent value="notes">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <h2 className="text-2xl font-bold text-foreground mb-6">Personal Notes</h2>
              {savedColleges.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Save colleges to add notes about them.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {savedColleges.map(saved => (
                    <Card key={saved.id} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          {saved.college_name}
                          <Badge variant="secondary" className="text-xs ml-auto">{saved.status}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Write your thoughts about this school..."
                          value={saved.notes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSavedColleges(prev => prev.map(s => s.id === saved.id ? { ...s, notes: val } : s));
                          }}
                          onBlur={(e) => updateNotes(saved.id, e.target.value)}
                          className="min-h-[100px] text-sm"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* 7. AI Insights */}
          <TabsContent value="insights">
            <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={1}>
              <h2 className="text-2xl font-bold text-foreground mb-6">AI Insights</h2>
              {!insights ? (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Take the quiz to see personalized insights.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="bg-card border-border hover:shadow-card transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-primary/10"><Trophy className="h-5 w-5 text-primary" /></div>
                        <h3 className="font-semibold text-foreground">Best Academic Match</h3>
                      </div>
                      <p className="text-xl font-bold text-foreground mb-1">{insights.bestMatch.name}</p>
                      <p className="text-sm text-muted-foreground">{insights.bestMatch.fitScore}% match · {insights.bestMatch.location}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border hover:shadow-card transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10"><Wallet className="h-5 w-5 text-emerald-600" /></div>
                        <h3 className="font-semibold text-foreground">Most Affordable</h3>
                      </div>
                      <p className="text-xl font-bold text-foreground mb-1">{insights.mostAffordable.name}</p>
                      <p className="text-sm text-muted-foreground">{insights.mostAffordable.netPrice} net price</p>
                    </CardContent>
                  </Card>

                  {insights.safetySchool && (
                    <Card className="bg-card border-border hover:shadow-card transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10"><Shield className="h-5 w-5 text-emerald-600" /></div>
                          <h3 className="font-semibold text-foreground">Top Safety School</h3>
                        </div>
                        <p className="text-xl font-bold text-foreground mb-1">{insights.safetySchool.name}</p>
                        <p className="text-sm text-muted-foreground">{insights.safetySchool.acceptanceRate} acceptance rate</p>
                      </CardContent>
                    </Card>
                  )}
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

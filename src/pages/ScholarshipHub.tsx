import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Calendar, DollarSign, Sparkles, Lock, Bookmark, BookmarkCheck,
  Filter, MapPin, Loader2, GraduationCap, ExternalLink, Trash2,
  PenLine, Wand2, X, Crown, Target, Clock, TrendingUp,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startCheckout } from "@/lib/checkout";
import { capture } from "@/lib/posthog";
import ScholarshipDetailDialog from "@/components/ScholarshipDetailDialog";

// ─── Types ──────────────────────────────────────────────────────────────────
type Scholarship = {
  id: string;
  name: string;
  provider: string | null;
  amount: number;
  deadline: string;
  description: string;
  eligibility_tags: string[];
  majors: string[];
  state: string | null;
  merit_based: boolean;
  need_based: boolean;
  essay_required: boolean;
  min_gpa: number | null;
  grade_levels: string[];
  application_url: string | null;
  is_local: boolean;
};

type SavedRow = {
  id: string;
  scholarship_id: string;
  status: string;
};

type StudentProfile = {
  state?: string;
  intended_major?: string;
  gpa?: number;
  grade_level?: string;
  activities?: string[];
  leadership?: string;
  volunteer?: string;
  sports?: string[];
  career_goals?: string;
};

const FREE_VIEW_LIMIT = 5;
const FREE_SAVE_LIMIT = 2;

// ─── Animated counter ───────────────────────────────────────────────────────
const useAnimatedNumber = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};

// ─── Match scoring ──────────────────────────────────────────────────────────
const scoreMatch = (s: Scholarship, p: StudentProfile): number => {
  let score = 50;
  if (p.state && s.state && p.state === s.state) score += 20;
  if (p.intended_major && s.majors.length > 0) {
    const m = p.intended_major.toLowerCase();
    if (s.majors.some((maj) => maj.toLowerCase() === "any" || m.includes(maj.toLowerCase()) || maj.toLowerCase().includes(m))) {
      score += 15;
    }
  } else if (s.majors.includes("Any")) {
    score += 5;
  }
  if (p.gpa && s.min_gpa) {
    if (p.gpa >= s.min_gpa) score += 10;
    else score -= 15;
  }
  if (p.grade_level && s.grade_levels.length > 0 && s.grade_levels.includes(p.grade_level)) score += 5;
  // Deadline urgency boost
  const days = daysUntil(s.deadline);
  if (days >= 0 && days <= 30) score += 3;
  return Math.max(20, Math.min(99, score));
};

const daysUntil = (iso: string): number => {
  const d = new Date(iso + "T23:59:59");
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const monthName = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleString("en-US", { month: "long" });

// ─── Component ──────────────────────────────────────────────────────────────
const ScholarshipHub = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isSubscribed, subscriptionLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [profile, setProfile] = useState<StudentProfile>({});

  // Filters
  const [filterAmount, setFilterAmount] = useState<string>("any");
  const [filterMonth, setFilterMonth] = useState<string>("any");
  const [filterMajor, setFilterMajor] = useState<string>("any");
  const [pillFilters, setPillFilters] = useState<Set<string>>(new Set());

  // Essay assistant
  const [essayOpen, setEssayOpen] = useState(false);
  const [essayScholarship, setEssayScholarship] = useState("");
  const [essayPrompt, setEssayPrompt] = useState("");
  const [essayDraft, setEssayDraft] = useState("");
  const [essayMode, setEssayMode] = useState<"brainstorm" | "outline" | "opening" | "proofread">("brainstorm");
  const [essayLoading, setEssayLoading] = useState(false);
  const [essayResult, setEssayResult] = useState("");

  // Scholarship detail dialog
  const [detailScholarship, setDetailScholarship] = useState<Scholarship | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [freeOutlinesUsed, setFreeOutlinesUsed] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(localStorage.getItem("scholarship-free-outlines-used") ?? 0);
    return Number.isFinite(v) ? v : 0;
  });

  const openDetailFor = (s: Scholarship) => {
    setDetailScholarship(s);
    setDetailOpen(true);
    capture("scholarship_detail_opened", { scholarship_id: s.id });
  };

  const handleFreeOutlineUsed = () => {
    setFreeOutlinesUsed((n) => {
      const next = n + 1;
      try { localStorage.setItem("scholarship-free-outlines-used", String(next)); } catch {}
      return next;
    });
  };

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Track page view
  useEffect(() => {
    if (user) capture("scholarship_hub_viewed", { is_premium: isSubscribed });
  }, [user, isSubscribed]);

  // Load data
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [scRes, savedRes, profRes, quizRes] = await Promise.all([
          (supabase as any).from("scholarships").select("*").order("deadline", { ascending: true }),
          (supabase as any).from("saved_scholarships").select("id, scholarship_id, status").eq("user_id", user.id),
          supabase.from("profiles").select("home_address").eq("id", user.id).maybeSingle(),
          supabase.from("quiz_answers").select("answers").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (cancelled) return;

        if (scRes.data) setScholarships(scRes.data as Scholarship[]);
        if (savedRes.data) setSaved(savedRes.data as SavedRow[]);

        // Build student profile from quiz + auth metadata
        const meta = (user.user_metadata ?? {}) as Record<string, any>;
        const quizAns = (quizRes.data?.answers ?? {}) as Record<string, any>;
        const home = profRes.data?.home_address ?? "";
        // Try to detect state from home_address (last 2-letter token)
        const stateMatch = home?.match(/\b([A-Z]{2})\b\s*\d{0,5}\s*$/);
        const arrify = (v: any): string[] | undefined => {
          if (!v) return undefined;
          if (Array.isArray(v)) return v.filter(Boolean).map(String);
          if (typeof v === "string" && v.trim()) return [v];
          return undefined;
        };
        setProfile({
          state: stateMatch?.[1] ?? meta.state ?? quizAns.state ?? undefined,
          intended_major: meta.intended_major ?? quizAns.intendedMajor ?? quizAns.intended_major ?? quizAns.major ?? undefined,
          gpa: typeof quizAns.gpa === "number" ? quizAns.gpa : Number(quizAns.gpa) || undefined,
          grade_level: meta.grade_level ?? quizAns.gradeLevel ?? quizAns.grade_level ?? "12",
          activities: arrify(quizAns.activities ?? quizAns.extracurriculars),
          leadership: quizAns.leadership ?? quizAns.leadershipExperience ?? undefined,
          volunteer: quizAns.volunteer ?? quizAns.communityService ?? quizAns.volunteerWork ?? undefined,
          sports: arrify(quizAns.sports ?? quizAns.athletics),
          career_goals: quizAns.careerGoals ?? quizAns.career_goals ?? quizAns.futureGoals ?? quizAns.openEnded ?? undefined,
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Sorted + scored
  const scored = useMemo(() => {
    return scholarships
      .map((s) => ({ ...s, _matchScore: scoreMatch(s, profile) }))
      .sort((a, b) => b._matchScore - a._matchScore);
  }, [scholarships, profile]);

  // Filtering
  const filtered = useMemo(() => {
    return scored.filter((s) => {
      if (filterAmount !== "any") {
        const min = Number(filterAmount);
        if (s.amount < min) return false;
      }
      if (filterMonth !== "any") {
        if (monthName(s.deadline) !== filterMonth) return false;
      }
      if (filterMajor !== "any") {
        const has = s.majors.some((m) => m.toLowerCase() === filterMajor.toLowerCase()) || s.majors.includes("Any");
        if (!has) return false;
      }
      if (pillFilters.has("merit") && !s.merit_based) return false;
      if (pillFilters.has("need") && !s.need_based) return false;
      if (pillFilters.has("essay") && !s.essay_required) return false;
      if (pillFilters.has("no-essay") && s.essay_required) return false;
      if (pillFilters.has("state-specific") && !s.state) return false;
      return true;
    });
  }, [scored, filterAmount, filterMonth, filterMajor, pillFilters]);

  const totalPotentialValue = useMemo(
    () => filtered.reduce((sum, s) => sum + s.amount, 0),
    [filtered]
  );
  const animatedTotal = useAnimatedNumber(totalPotentialValue, 1400);

  const savedIds = useMemo(() => new Set(saved.map((s) => s.scholarship_id)), [saved]);
  const savedList = useMemo(
    () => scholarships.filter((s) => savedIds.has(s.id)),
    [scholarships, savedIds]
  );

  const upcomingDeadlines = useMemo(() => {
    return savedList
      .map((s) => ({ ...s, days: daysUntil(s.deadline) }))
      .filter((s) => s.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [savedList]);

  // Free vs premium gating on visible cards
  const visibleScholarships = isSubscribed ? filtered : filtered.slice(0, FREE_VIEW_LIMIT);
  const lockedScholarships = isSubscribed ? [] : filtered.slice(FREE_VIEW_LIMIT, FREE_VIEW_LIMIT + 3);

  const togglePill = (key: string) => {
    setPillFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Save / unsave
  const handleSave = async (s: Scholarship) => {
    if (!user) return;
    const already = savedIds.has(s.id);
    if (already) {
      const row = saved.find((x) => x.scholarship_id === s.id);
      if (!row) return;
      const { error } = await (supabase as any).from("saved_scholarships").delete().eq("id", row.id);
      if (error) {
        toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
        return;
      }
      setSaved((prev) => prev.filter((x) => x.scholarship_id !== s.id));
      capture("scholarship_unsaved", { scholarship_id: s.id });
      return;
    }

    if (!isSubscribed && saved.length >= FREE_SAVE_LIMIT) {
      toast({
        title: "Save limit reached",
        description: `Free users can save ${FREE_SAVE_LIMIT} scholarships. Upgrade to save unlimited.`,
      });
      capture("scholarship_save_limit_hit");
      return;
    }

    const { data, error } = await (supabase as any)
      .from("saved_scholarships")
      .insert({
        user_id: user.id,
        scholarship_id: s.id,
        scholarship_name: s.name,
        amount: s.amount,
        deadline: s.deadline,
        status: "saved",
      })
      .select("id, scholarship_id, status")
      .single();

    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setSaved((prev) => [...prev, data as SavedRow]);
    capture("scholarship_saved", { scholarship_id: s.id, amount: s.amount });
    toast({ title: "Saved", description: `${s.name} added to your list.` });
  };

  const handleUpgrade = async () => {
    capture("scholarship_hub_upgrade_clicked");
    await startCheckout(toast, { isSubscribed });
  };

  const runEssayHelper = async () => {
    if (!isSubscribed) {
      toast({ title: "Premium feature", description: "Upgrade to use the AI essay assistant." });
      return;
    }
    setEssayLoading(true);
    setEssayResult("");
    try {
      const { data, error } = await supabase.functions.invoke("scholarship-essay-helper", {
        body: {
          mode: essayMode,
          scholarship: essayScholarship,
          prompt: essayPrompt,
          draft: essayDraft,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setEssayResult(data?.result ?? "");
      capture("scholarship_essay_helper_used", { mode: essayMode });
    } catch (e: any) {
      toast({
        title: "Essay helper error",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEssayLoading(false);
    }
  };

  const openEssayFor = (s: Scholarship) => {
    setEssayScholarship(s.name);
    setEssayPrompt("");
    setEssayDraft("");
    setEssayResult("");
    setEssayMode("brainstorm");
    setEssayOpen(true);
  };

  const allMajors = useMemo(() => {
    const set = new Set<string>();
    scholarships.forEach((s) => s.majors.forEach((m) => m !== "Any" && set.add(m)));
    return Array.from(set).sort();
  }, [scholarships]);

  const localScholarships = useMemo(() => {
    if (!profile.state) return scored.filter((s) => s.is_local).slice(0, 4);
    return scored.filter((s) => s.state === profile.state);
  }, [scored, profile.state]);

  const submittedCount = saved.filter((s) => s.status === "submitted").length;
  const deadlinesThisMonth = upcomingDeadlines.filter((d) => d.days <= 30).length;

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 container px-4">
          <Skeleton className="h-12 w-72 mb-6" />
          <Skeleton className="h-32 w-full mb-8" />
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-ambient relative overflow-hidden flex flex-col">
      {/* Ambient floating glow shapes — matches Dashboard */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-purple-400/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/3 w-[24rem] h-[24rem] rounded-full bg-blue-300/10 blur-3xl" />

      <Header />

      <main className="flex-1 pt-24 pb-16 relative">
        <div className="container px-4 max-w-7xl mx-auto">

          {/* ─── Premium Hero (matches Dashboard) ─── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="relative overflow-hidden rounded-3xl bg-hero-glass shadow-elevated">
              <div aria-hidden className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
              <div aria-hidden className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />

              <div className="relative p-6 sm:p-8 md:p-10 text-white">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-white/90" />
                      <span className="text-xs font-semibold tracking-widest uppercase text-white/80">Scholarship Hub</span>
                      {isSubscribed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur border border-white/25 text-[10px] font-semibold uppercase tracking-wide">
                          <Crown className="h-3 w-3" fill="currentColor" /> Premium
                        </span>
                      )}
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                      Find scholarships <br className="hidden sm:block" />made for you
                    </h1>
                    <p className="text-white/85 text-sm sm:text-base mt-3 max-w-xl">
                      Personalized matches, deadline tracking, and AI essay help — all in one place.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-5 min-w-[240px]">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold text-white/80 mb-1">
                      <Sparkles className="h-3.5 w-3.5" /> Potential value
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold tabular-nums leading-none">
                      {formatMoney(animatedTotal)}
                    </div>
                    <p className="text-[11px] text-white/75 mt-2">
                      Across {filtered.length} matched scholarship{filtered.length === 1 ? "" : "s"}
                      {profile.state && ` · incl. ${profile.state} local`}
                    </p>
                  </div>
                </div>

                {/* Summary stat tiles — same pattern as Dashboard */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-7">
                  {[
                    { label: "Matched", value: filtered.length, icon: Target },
                    { label: "Saved", value: saved.length, icon: Bookmark },
                    { label: "Submitted", value: submittedCount, icon: BookmarkCheck },
                    { label: "Due This Month", value: deadlinesThisMonth, icon: Clock, accent: deadlinesThisMonth > 0 },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-4 hover:bg-white/20 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 rounded-xl bg-white/20">
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          {stat.accent && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                          )}
                        </div>
                        <p className="text-3xl font-bold text-white leading-none">{stat.value}</p>
                        <p className="text-[11px] sm:text-xs font-medium text-white/80 mt-1.5 uppercase tracking-wide">
                          {stat.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.section>

          {/* ─── Engagement banner ─── */}
          {(saved.length > 0 || deadlinesThisMonth > 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 flex flex-wrap gap-3 items-center"
            >
              {saved.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
                  <BookmarkCheck className="h-4 w-4" /> You've saved {saved.length} scholarship{saved.length === 1 ? "" : "s"}
                </div>
              )}
              {deadlinesThisMonth > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200">
                  <Clock className="h-4 w-4" /> {deadlinesThisMonth} deadline{deadlinesThisMonth === 1 ? "" : "s"} this month — apply soon
                </div>
              )}
            </motion.div>
          )}

          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            {/* ─── Main column ─── */}
            <div>
              {/* Filter bar */}
              <Card className="card-premium mb-6 overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
                <div className="h-1 bg-gradient-to-r from-brand-purple via-primary to-brand-teal" aria-hidden />
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Filter scholarships</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <Select value={filterAmount} onValueChange={setFilterAmount}>
                      <SelectTrigger><SelectValue placeholder="Amount" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any amount</SelectItem>
                        <SelectItem value="1000">$1,000+</SelectItem>
                        <SelectItem value="3000">$3,000+</SelectItem>
                        <SelectItem value="5000">$5,000+</SelectItem>
                        <SelectItem value="10000">$10,000+</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                      <SelectTrigger><SelectValue placeholder="Deadline month" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any month</SelectItem>
                        {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterMajor} onValueChange={setFilterMajor}>
                      <SelectTrigger><SelectValue placeholder="Major" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any major</SelectItem>
                        {allMajors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "merit", label: "Merit Based" },
                      { key: "need", label: "Need Based" },
                      { key: "essay", label: "Essay Required" },
                      { key: "no-essay", label: "No Essay" },
                      { key: "state-specific", label: "State Specific" },
                    ].map((p) => {
                      const active = pillFilters.has(p.key);
                      const disabled = !isSubscribed && (p.key === "state-specific");
                      return (
                        <button
                          key={p.key}
                          disabled={disabled}
                          onClick={() => !disabled && togglePill(p.key)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {disabled && <Lock className="h-3 w-3 inline mr-1" />}
                          {p.label}
                        </button>
                      );
                    })}
                    {(pillFilters.size > 0 || filterAmount !== "any" || filterMonth !== "any" || filterMajor !== "any") && (
                      <button
                        onClick={() => { setPillFilters(new Set()); setFilterAmount("any"); setFilterMonth("any"); setFilterMajor("any"); }}
                        className="text-xs font-medium px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3 inline mr-1" /> Clear
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Personalized matches */}
              <section className="mb-10">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Your matches
                  </h2>
                  <span className="text-sm text-muted-foreground">{filtered.length} found</span>
                </div>

                {loading ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-56 w-full" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground">
                    No scholarships match your filters. Try clearing some.
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <AnimatePresence>
                      {visibleScholarships.map((s, i) => (
                        <ScholarshipCard
                          key={s.id}
                          s={s}
                          saved={savedIds.has(s.id)}
                          onSave={() => handleSave(s)}
                          onEssay={() => openEssayFor(s)}
                          isPremium={isSubscribed}
                          delay={i * 0.04}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Locked previews + paywall */}
                {lockedScholarships.length > 0 && (
                  <div className="mt-6">
                    <div className="grid sm:grid-cols-2 gap-4 relative">
                      {lockedScholarships.map((s) => (
                        <div key={s.id} className="relative">
                          <ScholarshipCard
                            s={s}
                            saved={false}
                            onSave={() => {}}
                            onEssay={() => {}}
                            isPremium={false}
                            locked
                            delay={0}
                          />
                        </div>
                      ))}
                    </div>
                    <Card className="card-premium mt-6 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 to-brand-purple/5 backdrop-blur-sm">
                      <div className="h-1 bg-gradient-hero" aria-hidden />
                      <CardContent className="p-6 md:p-8 text-center">
                        <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          Unlock all scholarship matches
                        </h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                          Get unlimited matches, deadline tracking, full filters, AI essay help, and local scholarships.
                        </p>
                        <Button onClick={handleUpgrade} size="lg" className="shadow-soft">
                          <Sparkles className="h-4 w-4 mr-2" /> Upgrade to Premium
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </section>

              {/* Local scholarships */}
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Scholarships near you {profile.state && <span className="text-muted-foreground font-normal">— {profile.state}</span>}
                  </h2>
                  {!isSubscribed && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
                {!isSubscribed ? (
                  <Card className="p-6 border-dashed">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Local scholarships are a Premium feature</p>
                        <p className="text-sm text-muted-foreground">Find scholarships specific to your state and area.</p>
                      </div>
                      <Button size="sm" onClick={handleUpgrade}>Upgrade</Button>
                    </div>
                  </Card>
                ) : localScholarships.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    No local scholarships found yet — check back soon.
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {localScholarships.slice(0, 4).map((s, i) => (
                      <ScholarshipCard
                        key={s.id}
                        s={s}
                        saved={savedIds.has(s.id)}
                        onSave={() => handleSave(s)}
                        onEssay={() => openEssayFor(s)}
                        isPremium={isSubscribed}
                        delay={i * 0.04}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Essay assistant card */}
              <section className="mb-10">
                <Card className="card-premium overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm">
                  <div className="h-1 bg-gradient-hero" aria-hidden />
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-primary" />
                          Scholarship Essay Helper
                          {!isSubscribed && <Lock className="h-4 w-4 text-muted-foreground" />}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Brainstorm angles, build outlines, draft strong openings, and proofread.
                        </p>
                      </div>
                      <Button
                        onClick={() => isSubscribed ? setEssayOpen(true) : handleUpgrade()}
                        className="shrink-0"
                      >
                        {isSubscribed ? (<><PenLine className="h-4 w-4 mr-2" /> Open</>) : (<><Crown className="h-4 w-4 mr-2" /> Upgrade</>)}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              </section>
            </div>

            {/* ─── Side panel: deadline tracker ─── */}
            <aside className="lg:sticky lg:top-24 self-start">
              <Card className="card-premium border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Deadline Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="upcoming">
                    <TabsList className="grid grid-cols-3 mb-3 w-full">
                      <TabsTrigger value="upcoming" className="text-xs">Upcoming</TabsTrigger>
                      <TabsTrigger value="saved" className="text-xs">Saved</TabsTrigger>
                      <TabsTrigger value="submitted" className="text-xs">Done</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upcoming" className="space-y-2 mt-0">
                      {!isSubscribed ? (
                        <PaywallMini onUpgrade={handleUpgrade} text="Upgrade to track all your deadlines." />
                      ) : upcomingDeadlines.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No saved deadlines yet.
                        </p>
                      ) : (
                        upcomingDeadlines.map((d) => (
                          <DeadlineRow key={d.id} name={d.name} days={d.days} amount={d.amount} />
                        ))
                      )}
                    </TabsContent>
                    <TabsContent value="saved" className="space-y-2 mt-0">
                      {savedList.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Save scholarships to see them here.
                        </p>
                      ) : (
                        savedList.map((s) => {
                          const row = saved.find((x) => x.scholarship_id === s.id);
                          return (
                            <SavedRowItem
                              key={s.id}
                              name={s.name}
                              amount={s.amount}
                              status={row?.status ?? "saved"}
                              onRemove={() => handleSave(s)}
                              onMarkSubmitted={async () => {
                                if (!row) return;
                                const newStatus = row.status === "submitted" ? "saved" : "submitted";
                                const { error } = await (supabase as any)
                                  .from("saved_scholarships")
                                  .update({ status: newStatus })
                                  .eq("id", row.id);
                                if (error) {
                                  toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
                                  return;
                                }
                                setSaved((prev) => prev.map((x) => x.id === row.id ? { ...x, status: newStatus } : x));
                              }}
                            />
                          );
                        })
                      )}
                    </TabsContent>
                    <TabsContent value="submitted" className="space-y-2 mt-0">
                      {savedList.filter((s) => saved.find((x) => x.scholarship_id === s.id)?.status === "submitted").length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Mark applications as submitted to track them.
                        </p>
                      ) : (
                        savedList
                          .filter((s) => saved.find((x) => x.scholarship_id === s.id)?.status === "submitted")
                          .map((s) => (
                            <div key={s.id} className="text-sm p-2 rounded bg-emerald-50 border border-emerald-200">
                              <div className="font-medium text-foreground">{s.name}</div>
                              <div className="text-emerald-700 text-xs">Submitted ✓ · {formatMoney(s.amount)}</div>
                            </div>
                          ))
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {!isSubscribed && (
                <Card className="card-premium mt-4 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 to-brand-purple/5 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <Crown className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground mb-2">Go Premium</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Unlimited matches, saves, deadlines & AI essay help.
                    </p>
                    <Button size="sm" className="w-full" onClick={handleUpgrade}>
                      Upgrade — $9.99/mo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Essay assistant dialog */}
      <Dialog open={essayOpen} onOpenChange={setEssayOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Essay Helper
              <Badge variant="outline" className="ml-2 text-xs">Premium</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Scholarship</label>
              <Input
                value={essayScholarship}
                onChange={(e) => setEssayScholarship(e.target.value)}
                placeholder="e.g. STEM Scholars Award"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Essay prompt</label>
              <Textarea
                value={essayPrompt}
                onChange={(e) => setEssayPrompt(e.target.value)}
                placeholder="Paste the essay prompt or topic..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">What do you need?</label>
              <div className="flex flex-wrap gap-2">
                {([
                  ["brainstorm", "Brainstorm ideas"],
                  ["outline", "Build outline"],
                  ["opening", "Opening paragraph"],
                  ["proofread", "Proofread my draft"],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setEssayMode(k)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      essayMode === k
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {essayMode === "proofread" && (
              <div>
                <label className="text-sm font-medium text-foreground">Your draft</label>
                <Textarea
                  value={essayDraft}
                  onChange={(e) => setEssayDraft(e.target.value)}
                  placeholder="Paste your draft here..."
                  rows={6}
                />
              </div>
            )}
            <Button onClick={runEssayHelper} disabled={essayLoading} className="w-full">
              {essayLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate</>}
            </Button>
            {essayResult && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                {essayResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────
const ScholarshipCard = ({
  s, saved, onSave, onEssay, isPremium, locked = false, delay = 0,
}: {
  s: Scholarship & { _matchScore?: number };
  saved: boolean;
  onSave: () => void;
  onEssay: () => void;
  isPremium: boolean;
  locked?: boolean;
  delay?: number;
}) => {
  const days = daysUntil(s.deadline);
  const urgency = days <= 14 ? "urgent" : days <= 30 ? "soon" : "ok";
  const matchScore = s._matchScore ?? 75;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={locked ? "relative" : ""}
    >
      <Card className={`card-premium h-full overflow-hidden border-border/60 bg-card/80 backdrop-blur-sm transition-all hover:shadow-card ${locked ? "blur-sm pointer-events-none select-none" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">{s.name}</h3>
              {s.provider && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.provider}</p>}
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20 shrink-0">
              <Target className="h-3 w-3 mr-1" /> {matchScore}%
            </Badge>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1 text-foreground font-bold">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              {formatMoney(s.amount)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">max award</span>
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              urgency === "urgent" ? "bg-red-50 text-red-700 border border-red-200" :
              urgency === "soon" ? "bg-amber-50 text-amber-700 border border-amber-200" :
              "bg-muted text-muted-foreground border border-border"
            }`}>
              <Clock className="h-3 w-3" /> {days >= 0 ? `${days} days left` : "Closed"}
            </div>
          </div>
          {s.application_url && (
            <a
              href={s.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3"
            >
              Verify amount on official site <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{s.description}</p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {s.eligibility_tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {t}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant={saved ? "default" : "outline"}
              size="sm"
              onClick={onSave}
              className="flex-1"
            >
              {saved ? <><BookmarkCheck className="h-3.5 w-3.5 mr-1.5" /> Saved</> : <><Bookmark className="h-3.5 w-3.5 mr-1.5" /> Save</>}
            </Button>
            {s.application_url ? (
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a href={s.application_url} target="_blank" rel="noopener noreferrer">
                  Details <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onEssay} className="flex-1">
                <PenLine className="h-3.5 w-3.5 mr-1" /> Essay help
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 border border-border shadow-soft">
            <Lock className="h-5 w-5 text-primary" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

const DeadlineRow = ({ name, days, amount }: { name: string; days: number; amount: number }) => {
  const urgent = days <= 14;
  return (
    <div className="text-sm p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="font-medium text-foreground line-clamp-1 mb-1">{name}</div>
      <div className="flex items-center justify-between text-xs">
        <span className={urgent ? "text-red-600 font-semibold" : "text-muted-foreground"}>
          {days} days left
        </span>
        <span className="text-emerald-700 font-medium">{formatMoney(amount)}</span>
      </div>
    </div>
  );
};

const SavedRowItem = ({
  name, amount, status, onRemove, onMarkSubmitted,
}: { name: string; amount: number; status: string; onRemove: () => void; onMarkSubmitted: () => void }) => (
  <div className="text-sm p-2.5 rounded-lg border border-border">
    <div className="font-medium text-foreground line-clamp-1 mb-1">{name}</div>
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-muted-foreground">{formatMoney(amount)}</span>
      <div className="flex gap-1">
        <button
          onClick={onMarkSubmitted}
          className="text-primary hover:underline font-medium"
        >
          {status === "submitted" ? "Undo" : "Mark submitted"}
        </button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive ml-1">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  </div>
);

const PaywallMini = ({ onUpgrade, text }: { onUpgrade: () => void; text: string }) => (
  <div className="text-center py-6 px-3">
    <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
    <p className="text-sm text-muted-foreground mb-3">{text}</p>
    <Button size="sm" onClick={onUpgrade}>Upgrade</Button>
  </div>
);

export default ScholarshipHub;

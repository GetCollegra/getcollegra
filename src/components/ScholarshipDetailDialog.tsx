import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award, Calendar, CheckCircle2, Circle, Clock, DollarSign, ExternalLink,
  GraduationCap, Lightbulb, Loader2, Lock, Sparkles, Target, Users, Wand2, Crown,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { capture } from "@/lib/posthog";

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

type StudentProfileFull = {
  state?: string;
  intended_major?: string;
  gpa?: number;
  grade_level?: string;
  activities?: string[] | string;
  leadership?: string;
  volunteer?: string;
  sports?: string[] | string;
  career_goals?: string;
};

type Props = {
  scholarship: Scholarship | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPremium: boolean;
  studentProfile: StudentProfileFull;
  freeOutlinesUsed: number;
  onFreeOutlineUsed: () => void;
  onUpgrade: () => void;
};

const FREE_OUTLINE_LIMIT = 1;

const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const daysUntil = (iso: string): number => {
  const d = new Date(iso + "T23:59:59");
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

// Determine scholarship category for strategy card
const inferCategory = (s: Scholarship): "merit" | "leadership" | "service" | "athletic" | "major" => {
  const tags = s.eligibility_tags.map((t) => t.toLowerCase()).join(" ");
  const desc = s.description.toLowerCase();
  if (/athlet|sport/.test(tags + desc)) return "athletic";
  if (/leader/.test(tags + desc)) return "leadership";
  if (/service|volunteer|community/.test(tags + desc)) return "service";
  if (s.majors.length > 0 && !s.majors.includes("Any")) return "major";
  return "merit";
};

const STRATEGY: Record<string, { title: string; tip: string }> = {
  merit: { title: "Merit Scholarship", tip: "Focus on grades, class rigor, awards, and academic goals." },
  leadership: { title: "Leadership Scholarship", tip: "Focus on leading others, solving problems, and measurable impact." },
  service: { title: "Community Service Scholarship", tip: "Focus on who you helped and what changed because of your work." },
  athletic: { title: "Athletic Scholarship", tip: "Focus on discipline, teamwork, growth, and coachability." },
  major: { title: "Major-Based Scholarship", tip: "Focus on why you care about that field and your future plan." },
};

const SUCCESS_PATTERNS = [
  "Students with similar activities often emphasized leadership and concrete results.",
  "Strong applicants connected one personal story to a future career goal.",
  "Volunteer-based scholarships read best when focused on community impact, not hours.",
  "Student-athletes often connected discipline and teamwork to academic resilience.",
  "Major-specific applications stood out when candidates named a specific problem they want to solve.",
];

export const ScholarshipDetailDialog = ({
  scholarship: s,
  open,
  onOpenChange,
  isPremium,
  studentProfile,
  freeOutlinesUsed,
  onFreeOutlineUsed,
  onUpgrade,
}: Props) => {
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");
  const [outline, setOutline] = useState("");
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [bestAngle, setBestAngle] = useState("");
  const [angleLoading, setAngleLoading] = useState(false);
  const [aiHelpDraft, setAiHelpDraft] = useState("");
  const [aiHelpResult, setAiHelpResult] = useState("");
  const [aiHelpLoading, setAiHelpLoading] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // Reset state when scholarship changes
  useEffect(() => {
    if (s?.id) {
      setOutline("");
      setBestAngle("");
      setAiHelpDraft("");
      setAiHelpResult("");
      setTab("overview");
      // restore checklist from localStorage
      try {
        const raw = localStorage.getItem(`scholarship-checklist:${s.id}`);
        setChecks(raw ? JSON.parse(raw) : {});
      } catch {
        setChecks({});
      }
    }
  }, [s?.id]);

  useEffect(() => {
    if (s?.id && Object.keys(checks).length > 0) {
      try { localStorage.setItem(`scholarship-checklist:${s.id}`, JSON.stringify(checks)); } catch {}
    }
  }, [checks, s?.id]);

  // Fire success_guide_viewed when tab opens
  useEffect(() => {
    if (open && tab === "guide" && s) {
      capture("scholarship_success_guide_viewed", { scholarship_id: s.id });
    }
  }, [open, tab, s]);

  const category = useMemo(() => (s ? inferCategory(s) : "merit"), [s]);
  const days = s ? daysUntil(s.deadline) : 0;

  if (!s) return null;

  const requirements: { key: string; label: string; required: boolean; detail?: string }[] = [
    { key: "essay", label: "Essay required", required: s.essay_required, detail: s.essay_required ? "Plan time for drafting and revisions" : "No essay needed" },
    { key: "transcript", label: "Transcript required", required: true, detail: "Request from your school counselor early" },
    { key: "rec_letter", label: "Recommendation letter", required: s.essay_required, detail: "Ask a teacher who knows you well, 3+ weeks ahead" },
    { key: "gpa", label: "Minimum GPA", required: !!s.min_gpa, detail: s.min_gpa ? `Required: ${s.min_gpa.toFixed(1)}+` : "No minimum stated" },
    { key: "major", label: "Major requirement", required: s.majors.length > 0 && !s.majors.includes("Any"), detail: s.majors.includes("Any") ? "Open to any major" : s.majors.join(", ") },
    { key: "residency", label: "Residency requirement", required: !!s.state, detail: s.state ? `${s.state} residents` : "No residency requirement" },
    { key: "deadline", label: "Application deadline", required: true, detail: new Date(s.deadline + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
  ];

  const completedCount = requirements.filter((r) => checks[r.key]).length;

  const generateOutline = async () => {
    if (!isPremium && freeOutlinesUsed >= FREE_OUTLINE_LIMIT) {
      toast({
        title: "Outline limit reached",
        description: `Free users can generate ${FREE_OUTLINE_LIMIT} outline. Upgrade for unlimited.`,
      });
      capture("scholarship_upgrade_click", { source: "outline_limit" });
      return;
    }
    setOutlineLoading(true);
    setOutline("");
    try {
      const { data, error } = await supabase.functions.invoke("scholarship-essay-helper", {
        body: {
          mode: "outline_personalized",
          scholarship: s.name,
          prompt: s.description,
          studentProfile,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutline(data?.result ?? "");
      capture("scholarship_outline_generated", { scholarship_id: s.id, is_premium: isPremium });
      if (!isPremium) onFreeOutlineUsed();
    } catch (e: any) {
      toast({ title: "Couldn't build outline", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setOutlineLoading(false);
    }
  };

  const generateBestAngle = async () => {
    if (!isPremium) return;
    setAngleLoading(true);
    setBestAngle("");
    try {
      const { data, error } = await supabase.functions.invoke("scholarship-essay-helper", {
        body: {
          mode: "best_angle",
          scholarship: s.name,
          prompt: s.description,
          studentProfile,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBestAngle(data?.result ?? "");
    } catch (e: any) {
      toast({ title: "Couldn't generate", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setAngleLoading(false);
    }
  };

  const runAiHelp = async (mode: "improve" | "brainstorm" | "proofread") => {
    if (!isPremium) {
      onUpgrade();
      return;
    }
    if ((mode === "improve" || mode === "proofread") && !aiHelpDraft.trim()) {
      toast({ title: "Add some text first", description: "Paste a draft or notes to improve." });
      return;
    }
    setAiHelpLoading(true);
    setAiHelpResult("");
    try {
      const { data, error } = await supabase.functions.invoke("scholarship-essay-helper", {
        body: {
          mode,
          scholarship: s.name,
          prompt: s.description,
          draft: aiHelpDraft,
          studentProfile,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiHelpResult(data?.result ?? "");
      capture("scholarship_ai_help_used", { scholarship_id: s.id, mode });
    } catch (e: any) {
      toast({ title: "AI help failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setAiHelpLoading(false);
    }
  };

  const toggleCheck = (key: string) => {
    setChecks((p) => ({ ...p, [key]: !p[key] }));
    capture("scholarship_requirement_checked", { scholarship_id: s.id, requirement: key });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3 pr-6">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-snug">{s.name}</div>
                {s.provider && <div className="text-xs text-muted-foreground font-normal mt-0.5">{s.provider}</div>}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-1 text-sm font-bold text-foreground">
              <DollarSign className="h-4 w-4 text-emerald-600" /> {formatMoney(s.amount)}
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              days <= 14 ? "bg-red-50 text-red-700 border border-red-200" :
              days <= 30 ? "bg-amber-50 text-amber-700 border border-amber-200" :
              "bg-muted text-muted-foreground border border-border"
            }`}>
              <Clock className="h-3 w-3" /> {days >= 0 ? `${days} days left` : "Closed"}
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{STRATEGY[category].title}</Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 pb-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="requirements" className="text-xs">
                Requirements
                <span className="ml-1 hidden sm:inline text-[10px] text-muted-foreground">{completedCount}/{requirements.length}</span>
              </TabsTrigger>
              <TabsTrigger value="guide" className="text-xs">Success Guide</TabsTrigger>
              <TabsTrigger value="outline" className="text-xs">Outline</TabsTrigger>
              <TabsTrigger value="deadlines" className="text-xs">Deadlines</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 mt-5">
              <p className="text-sm text-foreground leading-relaxed">{s.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {s.merit_based && <Badge variant="secondary" className="justify-center">Merit-based</Badge>}
                {s.need_based && <Badge variant="secondary" className="justify-center">Need-based</Badge>}
                {s.essay_required && <Badge variant="secondary" className="justify-center">Essay required</Badge>}
                {s.state && <Badge variant="secondary" className="justify-center">{s.state} only</Badge>}
              </div>
              {s.eligibility_tags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Eligibility</div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.eligibility_tags.map((t) => (
                      <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {s.application_url && (
                <Button asChild className="w-full">
                  <a href={s.application_url} target="_blank" rel="noopener noreferrer">
                    Open application <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
            </TabsContent>

            {/* REQUIREMENTS CHECKLIST */}
            <TabsContent value="requirements" className="space-y-2 mt-5">
              <div className="text-xs text-muted-foreground mb-2">
                Tap to mark complete — saved on this device.
              </div>
              {requirements.map((r) => {
                const done = !!checks[r.key];
                return (
                  <button
                    key={r.key}
                    onClick={() => toggleCheck(r.key)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      done ? "bg-emerald-50 border-emerald-200" : "bg-card border-border hover:border-primary/30"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        {r.label}
                        {r.required && <Badge variant="outline" className="text-[10px] py-0">Required</Badge>}
                      </div>
                      {r.detail && <div className="text-xs text-muted-foreground mt-0.5">{r.detail}</div>}
                    </div>
                  </button>
                );
              })}
            </TabsContent>

            {/* SUCCESS GUIDE */}
            <TabsContent value="guide" className="space-y-5 mt-5">
              {/* Best Angle */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Your Best Angle</h4>
                    {!isPremium && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  {!isPremium ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        Premium gives you a personalized recommendation built from your quiz answers and profile.
                      </p>
                      <Button size="sm" onClick={onUpgrade}>
                        <Crown className="h-3.5 w-3.5 mr-1.5" /> Upgrade
                      </Button>
                    </>
                  ) : bestAngle ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{bestAngle}</p>
                  ) : (
                    <Button size="sm" onClick={generateBestAngle} disabled={angleLoading}>
                      {angleLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Thinking…</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Show my angle</>}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Strategy card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Strategy: {STRATEGY[category].title}</h4>
                  </div>
                  <p className="text-sm text-foreground">{STRATEGY[category].tip}</p>
                </CardContent>
              </Card>

              {/* What Successful Students Highlighted */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">What Successful Students Highlighted</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    Based on common successful application patterns:
                  </p>
                  <ul className="space-y-2">
                    {SUCCESS_PATTERNS.map((p, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* AI Help tools */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">AI Writing Help</h4>
                    {!isPremium && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <Textarea
                    value={aiHelpDraft}
                    onChange={(e) => setAiHelpDraft(e.target.value)}
                    placeholder={isPremium ? "Paste your draft, bullet points, or rough ideas…" : "Premium feature"}
                    rows={4}
                    disabled={!isPremium}
                    className="mb-3"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={!isPremium || aiHelpLoading} onClick={() => runAiHelp("brainstorm")}>
                      Brainstorm bullets
                    </Button>
                    <Button size="sm" variant="outline" disabled={!isPremium || aiHelpLoading} onClick={() => runAiHelp("improve")}>
                      Make it more personal
                    </Button>
                    <Button size="sm" variant="outline" disabled={!isPremium || aiHelpLoading} onClick={() => runAiHelp("proofread")}>
                      Proofread
                    </Button>
                  </div>
                  {aiHelpLoading && (
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Working…
                    </div>
                  )}
                  {aiHelpResult && (
                    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                      {aiHelpResult}
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-[11px] text-muted-foreground italic text-center pt-1">
                Scholarship recommendations are guidance only and do not guarantee awards.
              </p>
            </TabsContent>

            {/* OUTLINE BUILDER */}
            <TabsContent value="outline" className="space-y-4 mt-5">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Build My Outline</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Generates a personalized 7-section application outline using your quiz answers, GPA, major, and activities.
                  </p>
                  {!isPremium && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Free users get {FREE_OUTLINE_LIMIT} outline. Used: {Math.min(freeOutlinesUsed, FREE_OUTLINE_LIMIT)}/{FREE_OUTLINE_LIMIT}.
                    </p>
                  )}
                  <Button onClick={generateOutline} disabled={outlineLoading} size="sm">
                    {outlineLoading ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> Build My Outline</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {outline && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-border bg-card p-4 text-sm whitespace-pre-wrap text-foreground leading-relaxed"
                >
                  {outline}
                </motion.div>
              )}

              <p className="text-[11px] text-muted-foreground italic text-center">
                This outline is guidance — your authentic voice matters most.
              </p>
            </TabsContent>

            {/* DEADLINES */}
            <TabsContent value="deadlines" className="space-y-3 mt-5">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Deadline timeline</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="Application due" value={new Date(s.deadline + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })} accent={days <= 14} />
                    <Row label="Suggested first draft" value={offsetDate(s.deadline, -21)} />
                    <Row label="Ask for recommendation" value={offsetDate(s.deadline, -28)} />
                    <Row label="Request transcript" value={offsetDate(s.deadline, -14)} />
                  </div>
                </CardContent>
              </Card>
              {s.application_url && (
                <Button asChild variant="outline" className="w-full">
                  <a href={s.application_url} target="_blank" rel="noopener noreferrer">
                    Verify deadline on official site <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${accent ? "text-red-700" : "text-foreground"}`}>{value}</span>
  </div>
);

const offsetDate = (iso: string, deltaDays: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + deltaDays);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });
};

export default ScholarshipDetailDialog;

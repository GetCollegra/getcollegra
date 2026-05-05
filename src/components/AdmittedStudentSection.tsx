import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Users, Target, FileText, Star, Lock, Sparkles,
  ChevronDown, GraduationCap, Award, ShieldCheck, SlidersHorizontal, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAdmittedRanges, fitVerdict, verdictTone, getSampleProfiles,
  type FitVerdict,
} from "@/lib/admittedStudentData";
import type { College } from "@/types/college";

type Props = { college: College };

const parseNum = (raw: any): number | null => {
  if (raw == null) return null;
  const s = String(raw);
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

export default function AdmittedStudentSection({ college }: Props) {
  const { user, isSubscribed } = useAuth();
  const navigate = useNavigate();
  const ranges = useMemo(() => getAdmittedRanges({ acceptanceRate: college.acceptanceRate }), [college.acceptanceRate]);

  const [studentGpa, setStudentGpa] = useState<number | null>(null);
  const [studentSat, setStudentSat] = useState<number | null>(null);
  const [studentAct, setStudentAct] = useState<number | null>(null);
  const [studentMajor, setStudentMajor] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: quiz } = await supabase
        .from("quiz_answers")
        .select("answers")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const a: any = quiz?.answers || {};
      // Try a wide set of plausible keys (Survey.tsx parses several)
      const gpa = parseNum(a.gpa ?? a.gpaRange ?? a.GPA);
      const sat = parseNum(a.satScore ?? a.sat_score ?? a.sat);
      const act = parseNum(a.actScore ?? a.act_score ?? a.act);
      setStudentGpa(gpa);
      setStudentSat(sat);
      setStudentAct(act);
      setStudentMajor(String(a.areaOfStudy ?? a.intendedMajor ?? a.major ?? ""));
    })();
  }, [user]);

  const samples = useMemo(
    () => getSampleProfiles(ranges, college.topPrograms?.[0]),
    [ranges, college.topPrograms],
  );

  const gpaVerdict = studentGpa != null ? fitVerdict(studentGpa, ranges.gpaLow, ranges.gpaHigh) : null;
  const satVerdict = studentSat != null ? fitVerdict(studentSat, ranges.sat25, ranges.sat75) : null;
  const actVerdict = studentAct != null ? fitVerdict(studentAct, ranges.act25, ranges.act75) : null;

  return (
    <Card className="bg-card border-l-[3px] border-l-cat-applications border-border/60 overflow-hidden">
      <div className="h-0.5 bg-cat-applications/70" />
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cat-applications/10">
              <Users className="h-5 w-5 text-cat-applications" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Students Who Got In</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> {ranges.sourceLabel}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-medium">{ranges.selectivity}</Badge>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat label="Avg Admitted GPA" value={ranges.avgGpa.toFixed(2)} sub={`${ranges.gpaLow.toFixed(1)}–${ranges.gpaHigh.toFixed(1)}`} />
          <Stat label="SAT (mid 50%)" value={`${ranges.sat25}–${ranges.sat75}`} />
          <Stat label="ACT (mid 50%)" value={`${ranges.act25}–${ranges.act75}`} />
          <Stat label="Acceptance Rate" value={ranges.acceptanceRatePct != null ? `${ranges.acceptanceRatePct}%` : (college.acceptanceRate || "—")} />
        </div>

        <Tabs defaultValue="fit" className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-muted/50 p-1 rounded-lg h-auto">
            <TabsTrigger value="fit" className="text-xs gap-1.5"><Target className="h-3.5 w-3.5" />Where You Fit</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs gap-1.5"><FileText className="h-3.5 w-3.5" />Application Profile</TabsTrigger>
            <TabsTrigger value="samples" className="text-xs gap-1.5"><Star className="h-3.5 w-3.5" />Sample Profiles</TabsTrigger>
          </TabsList>

          {/* Where You Fit */}
          <TabsContent value="fit" className="mt-4 space-y-3">
            {!isSubscribed && (
              <PremiumLock onClick={() => navigate("/profile?upgrade=1")} />
            )}
            <div className={isSubscribed ? "" : "blur-sm pointer-events-none select-none"}>
              <FitRow label="Your GPA" value={studentGpa?.toFixed(2)} range={`${ranges.gpaLow.toFixed(1)}–${ranges.gpaHigh.toFixed(1)}`} verdict={gpaVerdict} />
              <FitRow label="Your SAT" value={studentSat ? String(studentSat) : undefined} range={`${ranges.sat25}–${ranges.sat75}`} verdict={satVerdict} />
              <FitRow label="Your ACT" value={studentAct ? String(studentAct) : undefined} range={`${ranges.act25}–${ranges.act75}`} verdict={actVerdict} />
              {studentMajor && (
                <p className="text-xs text-muted-foreground pt-2">
                  <span className="font-semibold text-foreground">Intended major:</span> {studentMajor}
                  {college.topPrograms?.length > 0 && (
                    <> · <span className="text-cat-applications font-semibold">
                      {college.topPrograms.some(p => p.toLowerCase().includes(studentMajor.toLowerCase().slice(0, 5)))
                        ? "Aligned with this school's strengths"
                        : "Available — explore programs"}
                    </span></>
                  )}
                </p>
              )}
              {studentGpa == null && studentSat == null && studentAct == null && (
                <p className="text-xs text-muted-foreground pt-2">
                  Add your GPA and test scores in the quiz to see how you compare.
                </p>
              )}
            </div>
          </TabsContent>

          {/* Application Profile */}
          <TabsContent value="profile" className="mt-4">
            <div className="grid sm:grid-cols-2 gap-2.5">
              <ProfileItem icon={GraduationCap} label="Course Rigor" value={ranges.rigor} hint="Honors / AP / IB strength" />
              <ProfileItem icon={Award} label="Class Rank (top)" value={`Top ${ranges.classRankTop}%`} hint="Typical admit ranking" />
              <ProfileItem icon={FileText} label="Essay Importance" value={ranges.essayImportance} hint="Personal statement weight" />
              <ProfileItem icon={Sparkles} label="Recommendations" value={ranges.recImportance} hint="Teacher/counselor letters" />
            </div>
            <div className="mt-3 rounded-xl border border-cat-applications/20 bg-cat-applications/5 p-3">
              <p className="text-xs font-bold text-cat-applications uppercase tracking-wider mb-1">Common Activity Themes</p>
              <p className="text-sm text-foreground leading-relaxed">
                Leadership in clubs or sports, community service, summer programs or internships, and depth in 1–2 areas typically matter more than breadth.
              </p>
            </div>
          </TabsContent>

          {/* Samples */}
          <TabsContent value="samples" className="mt-4 space-y-2.5">
            {!isSubscribed && <PremiumLock onClick={() => navigate("/profile?upgrade=1")} />}
            <div className={isSubscribed ? "space-y-2.5" : "blur-sm pointer-events-none select-none space-y-2.5"}>
              <SampleFilters
                samples={samples}
                topPrograms={college.topPrograms || []}
                ranges={ranges}
              />
              <p className="text-[11px] text-muted-foreground italic pt-1">
                Sample profiles based on typical admitted student patterns — not real students.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <Collapsible>
          <CollapsibleTrigger className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
            About this data <ChevronDown className="h-3 w-3" />
          </CollapsibleTrigger>
          <CollapsibleContent className="text-[11px] text-muted-foreground leading-relaxed pt-2">
            Admissions data is for guidance only and does not guarantee results. Ranges are estimated from verified acceptance rates and typical admission patterns at schools of similar selectivity. Always confirm with the school's official admissions profile or Common Data Set.
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <p className="text-base font-bold text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{sub}</p>}
    </div>
  );
}

function FitRow({
  label, value, range, verdict,
}: { label: string; value?: string; range: string; verdict: FitVerdict | null }) {
  const tone = verdict ? verdictTone(verdict) : null;
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground tabular-nums">
          {value ?? <span className="text-muted-foreground italic">Not provided</span>}
          <span className="text-muted-foreground"> · range {range}</span>
        </p>
      </div>
      {verdict && tone && (
        <Badge className={`${tone.bg} ${tone.color} border font-semibold`}>{verdict}</Badge>
      )}
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="h-3 w-3 text-cat-applications" />{label}
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SampleCard({ s }: { s: import("@/lib/admittedStudentData").SampleProfile }) {
  const tone =
    s.outcome === "Admitted" ? "border-emerald-500/30 bg-emerald-500/5" :
    s.outcome === "Waitlisted" ? "border-amber-500/30 bg-amber-500/5" :
    "border-rose-500/30 bg-rose-500/5";
  const dot =
    s.outcome === "Admitted" ? "bg-emerald-500" :
    s.outcome === "Waitlisted" ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <span className={`h-2 w-2 rounded-full ${dot}`} /> {s.outcome}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">GPA {s.gpa} · SAT {s.sat} · ACT {s.act}</span>
      </div>
      <p className="text-sm text-foreground">
        <span className="font-semibold">{s.major}</span> · <span className="text-muted-foreground">{s.residency}</span> · {s.activities}</p>
      <p className="text-[11px] text-muted-foreground italic mt-1">{s.note}</p>
    </div>
  );
}

function PremiumLock({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-cat-applications/30 bg-cat-applications/5 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Lock className="h-4 w-4 text-cat-applications" />
        <span className="text-foreground font-medium">Premium feature — unlock detailed comparison and sample profiles.</span>
      </div>
      <Button size="sm" onClick={onClick} className="bg-cat-applications hover:bg-cat-applications/90 text-white">
        Upgrade
      </Button>
    </div>
  );
}

type Outcome = "Admitted" | "Waitlisted" | "Denied";
type Residency = "Any" | "In-State" | "Out-of-State";

function SampleFilters({
  samples,
  topPrograms,
  ranges,
}: {
  samples: import("@/lib/admittedStudentData").SampleProfile[];
  topPrograms: string[];
  ranges: { gpaLow: number; gpaHigh: number; sat25: number; sat75: number; act25: number; act75: number };
}) {
  const [open, setOpen] = useState(false);
  const [major, setMajor] = useState<string>("any");
  const [residency, setResidency] = useState<Residency>("Any");
  const [outcomes, setOutcomes] = useState<Outcome[]>(["Admitted", "Waitlisted", "Denied"]);

  const gpaMin = Math.max(2.0, +(ranges.gpaLow - 0.4).toFixed(2));
  const gpaMax = 4.0;
  const satMin = Math.max(800, ranges.sat25 - 200);
  const satMax = Math.min(1600, ranges.sat75 + 100);
  const actMin = Math.max(15, ranges.act25 - 5);
  const actMax = 36;

  const [gpa, setGpa] = useState<[number, number]>([gpaMin, gpaMax]);
  const [sat, setSat] = useState<[number, number]>([satMin, satMax]);
  const [act, setAct] = useState<[number, number]>([actMin, actMax]);

  const majors = useMemo(() => {
    const set = new Set<string>();
    samples.forEach((s) => set.add(s.major));
    topPrograms.forEach((p) => p && p !== "—" && p !== "Premium" && set.add(p));
    return Array.from(set);
  }, [samples, topPrograms]);

  const filtered = samples.filter((s) => {
    if (major !== "any" && s.major !== major) return false;
    if (residency !== "Any" && s.residency !== residency) return false;
    if (!outcomes.includes(s.outcome)) return false;
    if (s.gpa < gpa[0] || s.gpa > gpa[1]) return false;
    if (s.sat < sat[0] || s.sat > sat[1]) return false;
    if (s.act < act[0] || s.act > act[1]) return false;
    return true;
  });

  const activeCount =
    (major !== "any" ? 1 : 0) +
    (residency !== "Any" ? 1 : 0) +
    (outcomes.length !== 3 ? 1 : 0) +
    (gpa[0] !== gpaMin || gpa[1] !== gpaMax ? 1 : 0) +
    (sat[0] !== satMin || sat[1] !== satMax ? 1 : 0) +
    (act[0] !== actMin || act[1] !== actMax ? 1 : 0);

  const reset = () => {
    setMajor("any");
    setResidency("Any");
    setOutcomes(["Admitted", "Waitlisted", "Denied"]);
    setGpa([gpaMin, gpaMax]);
    setSat([satMin, satMax]);
    setAct([actMin, actMax]);
  };

  return (
    <div className="space-y-2.5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
          <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-cat-applications transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5 text-cat-applications" />
            Filters
            {activeCount > 0 && (
              <Badge className="bg-cat-applications/15 text-cat-applications border-cat-applications/30 h-5 px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">{filtered.length} of {samples.length}</span>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={reset}>
                <X className="h-3 w-3 mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>
        <CollapsibleContent className="pt-2.5">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Major</label>
                <Select value={major} onValueChange={setMajor}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Any major" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any major</SelectItem>
                    {majors.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Residency</label>
                <ToggleGroup
                  type="single"
                  value={residency}
                  onValueChange={(v) => v && setResidency(v as Residency)}
                  className="justify-start gap-1"
                >
                  {(["Any", "In-State", "Out-of-State"] as Residency[]).map((r) => (
                    <ToggleGroupItem key={r} value={r} className="h-8 px-2.5 text-[11px] data-[state=on]:bg-cat-applications/15 data-[state=on]:text-cat-applications">
                      {r}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Outcome</label>
              <ToggleGroup
                type="multiple"
                value={outcomes}
                onValueChange={(v) => v.length && setOutcomes(v as Outcome[])}
                className="justify-start gap-1"
              >
                {(["Admitted", "Waitlisted", "Denied"] as Outcome[]).map((o) => (
                  <ToggleGroupItem key={o} value={o} className="h-8 px-2.5 text-[11px] data-[state=on]:bg-cat-applications/15 data-[state=on]:text-cat-applications">
                    {o}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <RangeSlider label="GPA" min={gpaMin} max={gpaMax} step={0.1} value={gpa} onChange={setGpa} format={(n) => n.toFixed(1)} />
            <RangeSlider label="SAT" min={satMin} max={satMax} step={10} value={sat} onChange={setSat} format={(n) => String(n)} />
            <RangeSlider label="ACT" min={actMin} max={actMax} step={1} value={act} onChange={setAct} format={(n) => String(n)} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">No matching profiles</p>
          <p className="text-xs text-muted-foreground mt-1">Try widening your filters.</p>
        </div>
      ) : (
        filtered.map((s, i) => <SampleCard key={i} s={s} />)
      )}
    </div>
  );
}

function RangeSlider({
  label, min, max, step, value, onChange, format,
}: {
  label: string;
  min: number; max: number; step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format: (n: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        <span className="text-[11px] text-foreground tabular-nums font-medium">
          {format(value[0])} – {format(value[1])}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        className="[&_[role=slider]]:border-cat-applications [&>.bg-primary]:bg-cat-applications"
      />
    </div>
  );
}

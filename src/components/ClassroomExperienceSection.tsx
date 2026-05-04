import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, BookOpen, Sparkles, BarChart3 } from "lucide-react";
import { getClassroomExperience } from "@/lib/collegeExperience";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { College } from "@/types/college";

type Props = { college: College };

export default function ClassroomExperienceSection({ college }: Props) {
  const exp = useMemo(
    () => getClassroomExperience(college.studentFacultyRatio, college.studentBody),
    [college.studentFacultyRatio, college.studentBody],
  );
  const { user } = useAuth();
  const [comparisons, setComparisons] = useState<{ smaller: string[]; similar: string[]; larger: string[] }>({
    smaller: [], similar: [], larger: [],
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("saved_colleges")
        .select("college_name, college_data")
        .eq("user_id", user.id);
      if (!data) return;
      const smaller: string[] = [], similar: string[] = [], larger: string[] = [];
      for (const row of data) {
        if (row.college_name === college.name) continue;
        const c = row.college_data as unknown as College;
        const other = getClassroomExperience(c?.studentFacultyRatio, c?.studentBody);
        const diff = other.ratioNum - exp.ratioNum;
        if (diff <= -2) smaller.push(row.college_name);
        else if (diff >= 2) larger.push(row.college_name);
        else similar.push(row.college_name);
      }
      setComparisons({ smaller, similar, larger });
    })();
  }, [user, college.name, exp.ratioNum]);

  const personal = Math.min(100, Math.max(10, 105 - exp.ratioNum * 4));
  const lecture = Math.min(100, Math.max(5, exp.ratioNum * 4 - 25));

  return (
    <Card className="bg-card border-l-[3px] border-l-cat-academics border-border/60 overflow-hidden">
      <div className="h-0.5 bg-cat-academics/70" />
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Classroom Experience</h3>
              <p className="text-xs text-muted-foreground">
                {exp.estimated ? "Estimated from college size" : "From verified data"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold tabular-nums text-primary">{exp.ratio}</div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Student : Faculty</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Stat icon={Users} label="Avg Class Size" value={`~${exp.averageClassSize}`} />
          <Stat icon={BookOpen} label="Classes < 20" value={`${exp.pctUnder20}%`} />
          <Stat icon={BarChart3} label="Classes > 50" value={`${exp.pctOver50}%`} />
          <Stat icon={Sparkles} label="Prof. Access" value={`${exp.professorAccess}%`} />
        </div>

        {/* Visual comparison */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <Bar label="More Personal Attention" value={personal} tone="bg-primary" />
          <Bar label="Large Lecture Feel" value={lecture} tone="bg-muted-foreground/50" />
          <Bar label="Academic Support" value={exp.academicSupport} tone="bg-primary/70" />
        </div>

        {/* Badges */}
        {exp.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {exp.badges.map((b) => (
              <Badge key={b} variant="secondary" className="font-medium">{b}</Badge>
            ))}
          </div>
        )}

        {/* What this feels like */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> What This Feels Like
          </p>
          <p className="text-sm text-foreground leading-relaxed">{exp.feel}</p>
        </div>

        {/* Comparison vs saved colleges */}
        {(comparisons.smaller.length + comparisons.similar.length + comparisons.larger.length) > 0 && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Compared to your saved colleges</p>
            <div className="space-y-1.5 text-sm">
              {comparisons.smaller.length > 0 && (
                <p><span className="text-primary font-semibold">Smaller classes than</span> {comparisons.smaller.join(", ")}</p>
              )}
              {comparisons.similar.length > 0 && (
                <p><span className="text-foreground font-semibold">Similar ratio to</span> {comparisons.similar.join(", ")}</p>
              )}
              {comparisons.larger.length > 0 && (
                <p><span className="text-muted-foreground font-semibold">Larger classes than</span> {comparisons.larger.join(", ")}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/60">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="h-3 w-3 text-primary" />{label}
      </div>
      <p className="text-base font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

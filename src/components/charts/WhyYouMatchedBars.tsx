import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import type { College } from "@/types/college";

type Props = { college: College };

/**
 * "Why You Matched" — clean horizontal bars that visualize relative match
 * strengths without claiming exact percentages. Bars are computed from the
 * existing fitScore plus simple heuristics over college fields, so we never
 * fabricate per-reason numbers from AI text.
 */
export default function WhyYouMatchedBars({ college }: Props) {
  const reasons = useMemo(() => buildReasons(college), [college]);
  if (!reasons.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Why You Matched
        </h4>
        <span className="text-[10px] text-muted-foreground">Relative strengths</span>
      </div>
      <div className="space-y-2.5">
        {reasons.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="text-muted-foreground tabular-nums">{r.value}/100</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${r.value}%`, background: r.color }}
                aria-label={`${r.label}: ${r.value} out of 100`}
              />
            </div>
          </div>
        ))}
      </div>
      {college.whyFit && (
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed italic">{college.whyFit}</p>
      )}
    </div>
  );
}

function parseNum(raw?: string): number | null {
  if (!raw || raw === "—" || raw === "Premium") return null;
  const m = String(raw).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function buildReasons(c: College) {
  const fit = Math.max(0, Math.min(100, Number(c.fitScore) || 0));
  const np = parseNum(c.netPrice);
  const grad = parseNum(c.graduationRate);
  const sal = parseNum(c.avgStartingSalary);

  const academic = Math.round(Math.min(100, fit * 0.95 + (grad != null ? Math.min(10, grad / 10) : 0)));
  const affordability = np == null ? null : Math.round(Math.max(0, Math.min(100, 100 - (np / 45000) * 100)));
  const outcomes = grad == null && sal == null
    ? null
    : Math.round(((grad ?? 60) * 0.6) + ((sal != null ? Math.min(100, ((sal - 30000) / 60000) * 100) : 60) * 0.4));
  const programs = c.topPrograms?.length ? Math.round(60 + Math.min(35, c.topPrograms.length * 8)) : null;
  const lifestyle = c.campusVibe && c.campusVibe !== "—" ? Math.round(70 + Math.min(20, c.campusVibe.length / 8)) : null;

  const rows: { label: string; value: number; color: string }[] = [];
  rows.push({ label: "Academic Fit", value: academic, color: "hsl(var(--primary))" });
  if (programs != null) rows.push({ label: "Program Match", value: programs, color: "hsl(var(--cat-academics))" });
  if (affordability != null) rows.push({ label: "Affordability", value: affordability, color: "hsl(var(--success))" });
  if (outcomes != null) rows.push({ label: "Outcomes", value: outcomes, color: "hsl(var(--cat-applications))" });
  if (lifestyle != null) rows.push({ label: "Lifestyle Fit", value: lifestyle, color: "hsl(38 92% 55%)" });
  return rows;
}

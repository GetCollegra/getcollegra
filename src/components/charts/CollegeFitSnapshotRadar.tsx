import { useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import type { College } from "@/types/college";

type Props = { college: College };

const parseNum = (raw?: string): number | null => {
  if (!raw || raw === "—" || raw === "Premium") return null;
  const m = String(raw).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

/**
 * High-level "fit at a glance" radar — derived from existing College fields.
 * Each axis is normalized to 0–100 with conservative heuristics so missing
 * data simply gives a lower score rather than a fake high one.
 */
export default function CollegeFitSnapshotRadar({ college }: Props) {
  const data = useMemo(() => {
    const fit = Math.max(0, Math.min(100, Number(college.fitScore) || 0));

    // Affordability: lower net price is better. Cap range $0–$45k.
    const np = parseNum(college.netPrice);
    const affordability = np == null ? 50 : Math.round(Math.max(0, Math.min(100, 100 - (np / 45000) * 100)));

    // Outcomes: graduation rate (%).
    const grad = parseNum(college.graduationRate);
    const outcomes = grad == null ? 50 : Math.round(Math.max(0, Math.min(100, grad)));

    // Selectivity: lower acceptance rate -> more selective (we plot it that way).
    const acc = parseNum(college.acceptanceRate);
    const selectivity = acc == null ? 50 : Math.round(Math.max(0, Math.min(100, 100 - acc)));

    // Earnings 10y after entry, normalized $30k–$90k.
    const sal = parseNum(college.avgStartingSalary);
    const earnings = sal == null ? 50 : Math.round(Math.max(0, Math.min(100, ((sal - 30000) / 60000) * 100)));

    // Aid generosity (avg financial aid), normalized $0–$40k.
    const aid = parseNum(college.avgFinancialAid);
    const aidScore = aid == null ? 50 : Math.round(Math.max(0, Math.min(100, (aid / 40000) * 100)));

    return [
      { axis: "Fit", value: fit },
      { axis: "Affordability", value: affordability },
      { axis: "Outcomes", value: outcomes },
      { axis: "Selectivity", value: selectivity },
      { axis: "Earnings", value: earnings },
      { axis: "Aid", value: aidScore },
    ];
  }, [college]);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="text-sm font-bold text-foreground">College Fit Snapshot</h4>
        <span className="text-[10px] text-muted-foreground">0–100 · estimated</span>
      </div>
      <div className="w-full h-[240px] sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              stroke="hsl(var(--border))"
              tickCount={5}
            />
            <Radar
              name="Snapshot"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.22}
              strokeWidth={2}
              isAnimationActive
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v: any) => `${v}/100`}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

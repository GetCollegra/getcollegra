import { useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import {
  getAdmittedRadar, getStudentRadar, type AdmittedRanges, type RadarAxis,
} from "@/lib/admittedStudentData";

type Props = {
  ranges: AdmittedRanges;
  studentGpa: number | null;
  studentSat: number | null;
  studentAct: number | null;
};

const AXES: RadarAxis[] = [
  "GPA Strength", "Test Scores", "Course Rigor",
  "Extracurriculars", "Leadership", "Essay Strength", "Competitiveness",
];

/** Shorter labels so the chart stays readable on mobile. */
const SHORT: Record<RadarAxis, string> = {
  "GPA Strength": "GPA",
  "Test Scores": "Tests",
  "Course Rigor": "Rigor",
  "Extracurriculars": "Activities",
  "Leadership": "Leadership",
  "Essay Strength": "Essays",
  "Competitiveness": "Competitive",
};

export default function AdmittedStudentRadar({ ranges, studentGpa, studentSat, studentAct }: Props) {
  const data = useMemo(() => {
    const admitted = getAdmittedRadar(ranges);
    const student = getStudentRadar({ gpa: studentGpa, sat: studentSat, act: studentAct });
    return AXES.map((axis) => ({
      axis: SHORT[axis],
      fullAxis: axis,
      "Typical Admit": admitted[axis],
      "Your Profile": student[axis] ?? null,
    }));
  }, [ranges, studentGpa, studentSat, studentAct]);

  const hasStudent = data.some((d) => d["Your Profile"] != null);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h4 className="text-sm font-bold text-foreground">Admitted Student Profile</h4>
        <span className="text-[10px] text-muted-foreground">0–100 scale · estimated</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
        A visual snapshot of typical strengths{hasStudent ? " — your profile is overlaid where data is available." : "."}
      </p>
      <div className="w-full h-[260px] sm:h-[320px]">
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
              name="Typical Admit"
              dataKey="Typical Admit"
              stroke="hsl(var(--cat-applications))"
              fill="hsl(var(--cat-applications))"
              fillOpacity={0.28}
              strokeWidth={2}
              isAnimationActive
            />
            {hasStudent && (
              <Radar
                name="Your Profile"
                dataKey="Your Profile"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.18}
                strokeWidth={2}
                connectNulls
                isAnimationActive
              />
            )}
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelFormatter={(_, payload) => (payload?.[0]?.payload?.fullAxis as string) ?? ""}
              formatter={(v: any) => (v == null ? "—" : `${v}/100`)}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import type { College } from "@/types/college";

type Props = { college: College };

const parseNum = (raw?: string): number | null => {
  if (!raw || raw === "—" || raw === "Premium") return null;
  const m = String(raw).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
};

const fmtUsd = (n: number) =>
  n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;

/**
 * Simple cost-vs-payoff bar chart so students can see the trade-off at a glance.
 * Bars are colored by category meaning (cost = warning, salary = success, aid = primary).
 */
export default function CostRoiBarChart({ college }: Props) {
  const { data, hasAny } = useMemo(() => {
    const np = parseNum(college.netPrice);
    const aid = parseNum(college.avgFinancialAid);
    const sal = parseNum(college.avgStartingSalary);
    const rows = [
      np != null && { name: "Net Price / yr", value: np, color: "hsl(38 92% 50%)" },
      aid != null && { name: "Avg Aid / yr", value: aid, color: "hsl(var(--primary))" },
      sal != null && { name: "Earnings (10y)", value: sal, color: "hsl(var(--success))" },
    ].filter(Boolean) as { name: string; value: number; color: string }[];
    return { data: rows, hasAny: rows.length >= 2 };
  }, [college]);

  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/10 p-3 sm:p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h4 className="text-sm font-bold text-foreground">Cost &amp; ROI</h4>
        <span className="text-[10px] text-muted-foreground">Annual cost vs. typical earnings</span>
      </div>
      <div className="w-full h-[200px] sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickFormatter={fmtUsd}
              stroke="hsl(var(--border))"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
              width={110}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v: any) => fmtUsd(Number(v))}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
        Estimated cost is per year; earnings reflect median income 10 years after entry. Lower net price and
        higher earnings generally mean stronger return on investment.
      </p>
    </div>
  );
}

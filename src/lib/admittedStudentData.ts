/**
 * Heuristic "Admitted Student Data" layer.
 *
 * We do NOT have verified Common Data Set numbers for every school, so we
 * derive estimated ranges from the College Scorecard acceptance rate plus the
 * school's selectivity tier. All ranges are clearly labelled as estimated in
 * the UI. When `acceptanceRate` parses cleanly we treat it as verified data.
 *
 * Inputs come from the existing `College` object so we never need a new table.
 */

export type AdmittedRanges = {
  acceptanceRatePct: number | null;
  avgGpa: number;
  gpaLow: number;
  gpaHigh: number;
  sat25: number;
  sat75: number;
  act25: number;
  act75: number;
  classRankTop: number;       // e.g. "Top 10%" -> 10
  rigor: "Very High" | "High" | "Moderate";
  essayImportance: "Very High" | "High" | "Moderate";
  recImportance: "Very High" | "High" | "Moderate";
  selectivity: "Ultra-Selective" | "Highly Selective" | "Selective" | "Moderately Selective" | "Accessible";
  estimated: boolean;
  sourceLabel: string;
};

export type FitVerdict = "Below Range" | "Near Range" | "In Range" | "Above Range";

export type SampleProfile = {
  outcome: "Admitted" | "Waitlisted" | "Denied";
  gpa: number;
  sat: number;
  act: number;
  major: string;
  residency: "In-State" | "Out-of-State";
  activities: string;
  note: string;
};

const parsePct = (s?: string): number | null => {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
};

/** Map acceptance rate to baseline academic profile. */
function baseline(ratePct: number | null) {
  if (ratePct == null) {
    return { tier: "Selective" as const, gpa: 3.7, sat25: 1200, sat75: 1400, act25: 26, act75: 32, rank: 25 };
  }
  if (ratePct <= 10) return { tier: "Ultra-Selective" as const, gpa: 3.95, sat25: 1480, sat75: 1570, act25: 33, act75: 35, rank: 5 };
  if (ratePct <= 20) return { tier: "Highly Selective" as const, gpa: 3.9, sat25: 1410, sat75: 1530, act25: 31, act75: 34, rank: 10 };
  if (ratePct <= 35) return { tier: "Highly Selective" as const, gpa: 3.8, sat25: 1320, sat75: 1480, act25: 29, act75: 33, rank: 15 };
  if (ratePct <= 55) return { tier: "Selective" as const, gpa: 3.7, sat25: 1200, sat75: 1380, act25: 25, act75: 31, rank: 25 };
  if (ratePct <= 75) return { tier: "Moderately Selective" as const, gpa: 3.5, sat25: 1100, sat75: 1280, act25: 22, act75: 28, rank: 40 };
  return { tier: "Accessible" as const, gpa: 3.3, sat25: 1010, sat75: 1190, act25: 19, act75: 25, rank: 55 };
}

export function getAdmittedRanges(input: {
  acceptanceRate?: string;
}): AdmittedRanges {
  const pct = parsePct(input.acceptanceRate);
  const b = baseline(pct);
  const gpaLow = Math.max(2.5, +(b.gpa - 0.25).toFixed(2));
  const gpaHigh = Math.min(4.0, +(b.gpa + 0.1).toFixed(2));

  const rigor = b.tier === "Ultra-Selective" || b.tier === "Highly Selective" ? "Very High"
    : b.tier === "Selective" ? "High" : "Moderate";
  const essayImportance = b.tier === "Ultra-Selective" ? "Very High"
    : b.tier === "Highly Selective" || b.tier === "Selective" ? "High" : "Moderate";
  const recImportance = b.tier === "Ultra-Selective" || b.tier === "Highly Selective" ? "Very High"
    : b.tier === "Selective" ? "High" : "Moderate";

  return {
    acceptanceRatePct: pct,
    avgGpa: b.gpa,
    gpaLow,
    gpaHigh,
    sat25: b.sat25,
    sat75: b.sat75,
    act25: b.act25,
    act75: b.act75,
    classRankTop: b.rank,
    rigor,
    essayImportance,
    recImportance,
    selectivity: b.tier,
    estimated: true,
    sourceLabel: pct != null
      ? "Estimated from verified acceptance rate"
      : "Estimated based on typical admission patterns",
  };
}

export function fitVerdict(value: number, low: number, high: number): FitVerdict {
  if (value < low * 0.92) return "Below Range";
  if (value < low) return "Near Range";
  if (value <= high) return "In Range";
  return "Above Range";
}

export function verdictTone(v: FitVerdict): { color: string; bg: string } {
  switch (v) {
    case "In Range":     return { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" };
    case "Above Range":  return { color: "text-cat-applications", bg: "bg-cat-applications/10 border-cat-applications/30" };
    case "Near Range":   return { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
    case "Below Range":  return { color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/30" };
  }
}

/** Build sample anonymous profiles based on the school's tier. */
export function getSampleProfiles(r: AdmittedRanges, topMajor?: string): SampleProfile[] {
  const major = topMajor && topMajor !== "—" && topMajor !== "Premium" ? topMajor : "Undecided";
  const satMid = Math.round((r.sat25 + r.sat75) / 2);
  const actMid = Math.round((r.act25 + r.act75) / 2);
  const altMajors = ["Computer Science", "Business", "Biology", "Engineering", "Psychology", "English"];
  const pickAlt = (i: number) => altMajors[i % altMajors.length];
  return [
    {
      outcome: "Admitted",
      gpa: +Math.min(4.0, r.gpaHigh).toFixed(2),
      sat: r.sat75,
      act: r.act75,
      major,
      residency: "In-State",
      activities: "Varsity sport, leadership role, community volunteering",
      note: "Strong rigor, top-tier essays, and consistent leadership.",
    },
    {
      outcome: "Admitted",
      gpa: +(r.avgGpa).toFixed(2),
      sat: satMid,
      act: actMid,
      major,
      residency: "Out-of-State",
      activities: "Club officer, part-time job, summer program",
      note: "Solid academics paired with a clear, focused story.",
    },
    {
      outcome: "Admitted",
      gpa: +Math.min(4.0, r.avgGpa + 0.05).toFixed(2),
      sat: Math.round((satMid + r.sat75) / 2),
      act: Math.round((actMid + r.act75) / 2),
      major: pickAlt(0),
      residency: "Out-of-State",
      activities: "Research assistant, debate team captain",
      note: "Demonstrated depth in a focused academic interest.",
    },
    {
      outcome: "Waitlisted",
      gpa: +Math.max(2.7, r.gpaLow - 0.05).toFixed(2),
      sat: Math.max(900, r.sat25 - 40),
      act: Math.max(16, r.act25 - 1),
      major,
      residency: "In-State",
      activities: "NHS, part-time job",
      note: "Right academic ballpark; essays/activities could be sharper.",
    },
    {
      outcome: "Waitlisted",
      gpa: +Math.max(2.7, r.gpaLow + 0.05).toFixed(2),
      sat: Math.max(900, r.sat25 + 10),
      act: Math.max(16, r.act25),
      major: pickAlt(1),
      residency: "Out-of-State",
      activities: "Yearbook editor, tutoring",
      note: "Competitive but limited standout activities.",
    },
    {
      outcome: "Denied",
      gpa: +Math.max(2.5, r.gpaLow - 0.2).toFixed(2),
      sat: Math.max(880, r.sat25 - 90),
      act: Math.max(15, r.act25 - 3),
      major: pickAlt(2),
      residency: "Out-of-State",
      activities: "Limited extracurricular involvement",
      note: "Below typical academic profile for this school.",
    },
  ];
}

/** Map a qualitative label to a 0–100 score for the radar chart. */
function levelScore(level: "Very High" | "High" | "Moderate"): number {
  return level === "Very High" ? 92 : level === "High" ? 78 : 62;
}

function tierScore(tier: AdmittedRanges["selectivity"]): number {
  switch (tier) {
    case "Ultra-Selective": return 96;
    case "Highly Selective": return 88;
    case "Selective": return 76;
    case "Moderately Selective": return 64;
    case "Accessible": return 52;
  }
}

export type RadarAxis =
  | "GPA Strength" | "Test Scores" | "Course Rigor"
  | "Extracurriculars" | "Leadership" | "Essay Strength" | "Competitiveness";

/** 0–100 profile of the typical admitted student for radar visualization. */
export function getAdmittedRadar(r: AdmittedRanges): Record<RadarAxis, number> {
  const gpa = Math.round(Math.max(0, Math.min(100, ((r.avgGpa - 2.5) / (4.0 - 2.5)) * 100)));
  const satMid = (r.sat25 + r.sat75) / 2;
  const test = Math.round(Math.max(0, Math.min(100, ((satMid - 900) / (1600 - 900)) * 100)));
  const tier = tierScore(r.selectivity);
  return {
    "GPA Strength": gpa,
    "Test Scores": test,
    "Course Rigor": levelScore(r.rigor),
    "Extracurriculars": Math.round(tier * 0.9),
    "Leadership": Math.round(tier * 0.85),
    "Essay Strength": levelScore(r.essayImportance),
    "Competitiveness": tier,
  };
}

/**
 * Build a radar profile for the user from quiz inputs. Only axes that can be
 * derived directly from the student's data are filled; the others are left
 * undefined so the overlay shows a partial honest comparison instead of fake
 * scores.
 */
export function getStudentRadar(input: {
  gpa?: number | null; sat?: number | null; act?: number | null;
}): Partial<Record<RadarAxis, number>> {
  const out: Partial<Record<RadarAxis, number>> = {};
  if (input.gpa != null) {
    out["GPA Strength"] = Math.round(Math.max(0, Math.min(100, ((input.gpa - 2.5) / (4.0 - 2.5)) * 100)));
  }
  // Convert ACT to SAT-equivalent (~simple concordance) when SAT missing.
  let sat = input.sat ?? null;
  if (sat == null && input.act != null) {
    const map: Record<number, number> = { 36: 1590, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370, 29: 1340, 28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080, 20: 1040, 19: 1010, 18: 970, 17: 930, 16: 890, 15: 850 };
    sat = map[Math.round(input.act)] ?? null;
  }
  if (sat != null) {
    out["Test Scores"] = Math.round(Math.max(0, Math.min(100, ((sat - 900) / (1600 - 900)) * 100)));
  }
  return out;
}

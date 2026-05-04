/**
 * Heuristic data layer for "Classroom Experience" and "Walkability".
 * Real values come from college.studentFacultyRatio when available; otherwise
 * we infer reasonable estimates from student body size and setting/locale.
 *
 * All inferred values are clearly labelled "Estimated" in the UI.
 */

export type ClassroomExperience = {
  ratio: string;            // e.g. "14:1"
  ratioNum: number;         // numeric students per faculty (e.g. 14)
  estimated: boolean;
  averageClassSize: number;
  pctUnder20: number;       // 0-100
  pctOver50: number;        // 0-100
  professorAccess: number;  // 0-100
  academicSupport: number;  // 0-100
  badges: string[];
  feel: string;             // one-line description
};

export type WalkabilityCard = {
  key: string;
  label: string;
  icon: string;             // emoji
  score: number;            // 0-10
  distance: string;
  description: string;
};

export type Walkability = {
  score: number;            // 0-100
  estimated: boolean;
  campusFeel: string;       // e.g. "College Town Feel"
  carNeeded: number;        // 0-100 (lower = car not needed)
  badges: string[];
  cards: WalkabilityCard[];
  notices: string[];        // "What students will notice"
};

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const m = s.replace(/[, ]/g, "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

/** Parse a ratio string like "14:1" or "16 to 1" or just "14". */
function parseRatio(raw?: string): number | null {
  if (!raw || raw === "—" || raw === "Premium") return null;
  const m = raw.match(/(\d+)\s*[:to ]+\s*1/i) || raw.match(/^(\d{1,2})$/);
  return m ? parseInt(m[1], 10) : null;
}

export function getClassroomExperience(
  ratioRaw?: string,
  studentBody?: string,
): ClassroomExperience {
  const parsed = parseRatio(ratioRaw);
  const size = num(studentBody) ?? 0;

  let ratioNum = parsed ?? 0;
  let estimated = false;
  if (!parsed) {
    estimated = true;
    // Infer from size: larger schools tend to have higher ratios
    if (size >= 30000) ratioNum = 19;
    else if (size >= 15000) ratioNum = 17;
    else if (size >= 7000) ratioNum = 15;
    else if (size >= 2500) ratioNum = 12;
    else ratioNum = 10;
  }

  const averageClassSize = Math.round(ratioNum * 1.6);
  const pctUnder20 = Math.max(15, Math.min(85, 95 - ratioNum * 3.5));
  const pctOver50 = Math.max(2, Math.min(45, ratioNum * 1.6 - 12));
  const professorAccess = Math.max(35, Math.min(98, 110 - ratioNum * 3.8));
  const academicSupport = Math.max(40, Math.min(95, 100 - ratioNum * 2.8));

  const badges: string[] = [];
  if (ratioNum <= 13) badges.push("Small Class Feel");
  if (ratioNum <= 14) badges.push("Easy Professor Access");
  if (academicSupport >= 70) badges.push("Strong Academic Support");
  if (ratioNum >= 18 || pctOver50 >= 25) badges.push("Lecture Heavy");

  let feel: string;
  if (ratioNum <= 13) feel = "This school may feel more personal, with better access to professors.";
  else if (ratioNum <= 18) feel = "This school has a balanced classroom feel.";
  else feel = "Expect some larger classes, especially freshman year.";

  return {
    ratio: `${ratioNum}:1`,
    ratioNum,
    estimated,
    averageClassSize,
    pctUnder20: Math.round(pctUnder20),
    pctOver50: Math.round(pctOver50),
    professorAccess: Math.round(professorAccess),
    academicSupport: Math.round(academicSupport),
    badges,
    feel,
  };
}

/** Detect setting bucket from a free-text setting/locale string. */
function settingBucket(setting?: string): "urban" | "suburban" | "town" | "rural" {
  const s = (setting || "").toLowerCase();
  if (/city|urban|metropol/.test(s)) return "urban";
  if (/suburb/.test(s)) return "suburban";
  if (/town|small/.test(s)) return "town";
  if (/rural|remote/.test(s)) return "rural";
  return "suburban";
}

export function getWalkability(setting?: string, studentBody?: string): Walkability {
  const bucket = settingBucket(setting);
  const size = num(studentBody) ?? 0;

  // Base scores by setting
  const profile = {
    urban:    { score: 86, food: 9, coffee: 9, grocery: 8, hospital: 8, transport: 9, bike: 7, car: 25, feel: "City Campus", down: "8 min walk" },
    suburban: { score: 62, food: 7, coffee: 7, grocery: 6, hospital: 7, transport: 5, bike: 7, car: 55, feel: "Spread-Out Campus", down: "12 min drive" },
    town:     { score: 78, food: 8, coffee: 8, grocery: 7, hospital: 7, transport: 5, bike: 8, car: 35, feel: "College Town Feel", down: "6 min walk" },
    rural:    { score: 42, food: 5, coffee: 4, grocery: 4, hospital: 5, transport: 3, bike: 6, car: 80, feel: "Spread-Out Campus", down: "20 min drive" },
  }[bucket];

  // Slight adjustment for very large campuses (harder to walk)
  let score = profile.score;
  if (size >= 30000) score -= 6;
  if (size <= 3000) score += 4;
  score = Math.max(20, Math.min(98, score));

  const badges: string[] = [];
  if (score >= 80) badges.push("Super Walkable");
  else if (score >= 60) badges.push("Mostly Walkable");
  else if (score >= 40) badges.push("Car Helpful");
  else badges.push("Car Needed");
  badges.push(profile.feel);
  if (profile.transport >= 7) badges.push("Everything Nearby");

  const cards: WalkabilityCard[] = [
    { key: "food",      label: "Food Nearby",      icon: "🍔", score: profile.food,      distance: profile.food >= 7 ? "5–10 min walk" : "10–15 min",  description: "Restaurants and quick bites close to campus." },
    { key: "coffee",    label: "Coffee Nearby",    icon: "☕", score: profile.coffee,    distance: profile.coffee >= 7 ? "5 min walk" : "10+ min",     description: "Cafés for studying and meeting friends." },
    { key: "grocery",   label: "Groceries",        icon: "🛒", score: profile.grocery,   distance: profile.grocery >= 7 ? "10 min walk" : "Short drive", description: "Supermarkets and corner stores within reach." },
    { key: "health",    label: "Health & Safety",  icon: "🏥", score: profile.hospital,  distance: profile.hospital >= 7 ? "7 min drive" : "15 min drive", description: "Urgent care and hospital access." },
    { key: "transport", label: "Transportation",   icon: "🚆", score: profile.transport, distance: profile.transport >= 7 ? "Bus & rail" : "Limited",   description: "Public transit options near campus." },
    { key: "ent",       label: "Entertainment",    icon: "🎬", score: Math.min(10, profile.food + (bucket === "urban" ? 0 : -1)), distance: bucket === "urban" ? "Walking" : "Short drive", description: "Movies, music, nightlife and student hangouts." },
    { key: "campus",    label: "Campus Distance",  icon: "📍", score: Math.max(2, 11 - Math.round(size / 4000)), distance: size > 20000 ? "Larger campus" : "Compact",   description: "How easy it is to get class-to-class on foot." },
  ];

  const notices: string[] = [];
  if (profile.food >= 7) notices.push("Easy to walk to food after class");
  if (score >= 70) notices.push("Campus feels connected");
  if (profile.car <= 40) notices.push("A car is not necessary for most daily needs");
  else notices.push("A car will make off-campus trips much easier");
  if (profile.transport >= 7) notices.push("Public transit can replace having a car");

  return {
    score,
    estimated: true,
    campusFeel: profile.feel,
    carNeeded: profile.car,
    badges,
    cards,
    notices,
  };
}

/**
 * College sports data — heuristic mock layer.
 * Provides Division, Conference, popular sports, and a culture score per college.
 * Until a real data source is wired up, we infer reasonable values from the
 * college name (known programs) and fall back to size/locale-based defaults.
 */

export type SportsDivision = "I" | "II" | "III";

export type SportsTeam = {
  sport: string;
  division: SportsDivision;
  competitiveness: "Low" | "Moderate" | "High" | "Elite";
  recruitment: "Walk-on friendly" | "Competitive" | "Elite";
  ranking?: string;
};

export type CollegeSports = {
  division: SportsDivision;
  conference: string;
  mascot?: string;
  colors?: string[]; // hex colors, e.g. ["#990000", "#FFCC00"]
  popularSports: string[];
  cultureScore: number; // 1-5
  gameDay: string;
  badges: string[];
  knownFor?: string[];
  teams: SportsTeam[];
  achievements: string[];
  facilities: string[];
  experienceNotes: string;
};

type KnownEntry = {
  conference: string;
  division: SportsDivision;
  cultureScore?: number;
  knownFor?: string[];
  mascot?: string;
  colors?: string[];
  achievements?: string[];
  facilities?: string[];
};


const KNOWN: Record<string, KnownEntry> = {
  // SEC
  "alabama": { division: "I", conference: "SEC", knownFor: ["Football"], cultureScore: 5 },
  "georgia": { division: "I", conference: "SEC", knownFor: ["Football"], cultureScore: 5 },
  "florida": { division: "I", conference: "SEC", knownFor: ["Football", "Basketball"], cultureScore: 5 },
  "lsu": { division: "I", conference: "SEC", knownFor: ["Football", "Baseball"], cultureScore: 5 },
  "auburn": { division: "I", conference: "SEC", knownFor: ["Football"], cultureScore: 5 },
  "tennessee": { division: "I", conference: "SEC", knownFor: ["Football"], cultureScore: 5 },
  "kentucky": { division: "I", conference: "SEC", knownFor: ["Basketball"], cultureScore: 5 },
  "texas a&m": { division: "I", conference: "SEC", knownFor: ["Football"], cultureScore: 5 },
  "texas": { division: "I", conference: "SEC", knownFor: ["Football"], cultureScore: 5 },
  "arkansas": { division: "I", conference: "SEC", knownFor: ["Football", "Basketball"], cultureScore: 4 },

  // Big Ten
  "michigan": { division: "I", conference: "Big Ten", knownFor: ["Football", "Basketball"], cultureScore: 5 },
  "ohio state": { division: "I", conference: "Big Ten", knownFor: ["Football"], cultureScore: 5 },
  "penn state": { division: "I", conference: "Big Ten", knownFor: ["Football", "Wrestling"], cultureScore: 5 },
  "wisconsin": { division: "I", conference: "Big Ten", knownFor: ["Football", "Hockey"], cultureScore: 4 },
  "iowa": { division: "I", conference: "Big Ten", knownFor: ["Football", "Wrestling"], cultureScore: 4 },
  "indiana": { division: "I", conference: "Big Ten", knownFor: ["Basketball"], cultureScore: 4 },
  "illinois": { division: "I", conference: "Big Ten", knownFor: ["Basketball"], cultureScore: 4 },
  "michigan state": { division: "I", conference: "Big Ten", knownFor: ["Basketball", "Football"], cultureScore: 5 },
  "northwestern": { division: "I", conference: "Big Ten", cultureScore: 3 },
  "purdue": { division: "I", conference: "Big Ten", knownFor: ["Basketball"], cultureScore: 4 },
  "minnesota": { division: "I", conference: "Big Ten", knownFor: ["Hockey"], cultureScore: 3 },
  "rutgers": { division: "I", conference: "Big Ten", cultureScore: 3 },
  "maryland": { division: "I", conference: "Big Ten", knownFor: ["Lacrosse", "Basketball"], cultureScore: 4 },
  "ucla": { division: "I", conference: "Big Ten", knownFor: ["Basketball"], cultureScore: 4 },
  "usc": { division: "I", conference: "Big Ten", knownFor: ["Football"], cultureScore: 5 },
  "oregon": { division: "I", conference: "Big Ten", knownFor: ["Football", "Track & Field"], cultureScore: 5 },
  "washington": { division: "I", conference: "Big Ten", knownFor: ["Football"], cultureScore: 4 },

  // ACC
  "duke": { division: "I", conference: "ACC", knownFor: ["Basketball"], cultureScore: 5 },
  "north carolina": { division: "I", conference: "ACC", knownFor: ["Basketball"], cultureScore: 5 },
  "nc state": { division: "I", conference: "ACC", knownFor: ["Basketball"], cultureScore: 4 },
  "virginia": { division: "I", conference: "ACC", knownFor: ["Basketball", "Lacrosse"], cultureScore: 4 },
  "virginia tech": { division: "I", conference: "ACC", knownFor: ["Football"], cultureScore: 4 },
  "clemson": { division: "I", conference: "ACC", knownFor: ["Football"], cultureScore: 5 },
  "miami": { division: "I", conference: "ACC", knownFor: ["Football", "Baseball"], cultureScore: 4 },
  "florida state": { division: "I", conference: "ACC", knownFor: ["Football"], cultureScore: 5 },
  "syracuse": { division: "I", conference: "ACC", knownFor: ["Basketball", "Lacrosse"], cultureScore: 4 },
  "wake forest": { division: "I", conference: "ACC", cultureScore: 3 },
  "boston college": { division: "I", conference: "ACC", knownFor: ["Hockey"], cultureScore: 3 },
  "notre dame": { division: "I", conference: "ACC", knownFor: ["Football"], cultureScore: 5 },
  "stanford": { division: "I", conference: "ACC", knownFor: ["Swimming", "Soccer"], cultureScore: 4 },
  "california": { division: "I", conference: "ACC", cultureScore: 3 },

  // Big 12
  "oklahoma": { division: "I", conference: "Big 12", knownFor: ["Football", "Softball"], cultureScore: 5 },
  "oklahoma state": { division: "I", conference: "Big 12", knownFor: ["Wrestling", "Football"], cultureScore: 4 },
  "kansas": { division: "I", conference: "Big 12", knownFor: ["Basketball"], cultureScore: 5 },
  "kansas state": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },
  "baylor": { division: "I", conference: "Big 12", knownFor: ["Basketball"], cultureScore: 4 },
  "tcu": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },
  "texas tech": { division: "I", conference: "Big 12", knownFor: ["Football", "Basketball"], cultureScore: 4 },
  "west virginia": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },
  "iowa state": { division: "I", conference: "Big 12", knownFor: ["Wrestling"], cultureScore: 4 },
  "byu": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },
  "cincinnati": { division: "I", conference: "Big 12", knownFor: ["Basketball"], cultureScore: 3 },
  "houston": { division: "I", conference: "Big 12", knownFor: ["Basketball"], cultureScore: 4 },
  "ucf": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },
  "arizona": { division: "I", conference: "Big 12", knownFor: ["Basketball"], cultureScore: 4 },
  "arizona state": { division: "I", conference: "Big 12", cultureScore: 4 },
  "colorado": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },
  "utah": { division: "I", conference: "Big 12", knownFor: ["Football"], cultureScore: 4 },

  // Ivy
  "harvard": { division: "I", conference: "Ivy League", knownFor: ["Rowing"], cultureScore: 3 },
  "yale": { division: "I", conference: "Ivy League", knownFor: ["Rowing", "Hockey"], cultureScore: 3 },
  "princeton": { division: "I", conference: "Ivy League", knownFor: ["Lacrosse"], cultureScore: 3 },
  "columbia": { division: "I", conference: "Ivy League", cultureScore: 2 },
  "cornell": { division: "I", conference: "Ivy League", knownFor: ["Hockey", "Wrestling"], cultureScore: 3 },
  "dartmouth": { division: "I", conference: "Ivy League", knownFor: ["Skiing"], cultureScore: 3 },
  "brown": { division: "I", conference: "Ivy League", cultureScore: 2 },
  "pennsylvania": { division: "I", conference: "Ivy League", knownFor: ["Basketball"], cultureScore: 3 },

  // Patriot / Big East / others
  "villanova": { division: "I", conference: "Big East", knownFor: ["Basketball"], cultureScore: 4 },
  "georgetown": { division: "I", conference: "Big East", knownFor: ["Basketball"], cultureScore: 3 },
  "uconn": { division: "I", conference: "Big East", knownFor: ["Basketball"], cultureScore: 5 },
  "marquette": { division: "I", conference: "Big East", knownFor: ["Basketball"], cultureScore: 3 },
  "creighton": { division: "I", conference: "Big East", knownFor: ["Basketball"], cultureScore: 3 },

  "gonzaga": { division: "I", conference: "WCC", knownFor: ["Basketball"], cultureScore: 5 },
  "memphis": { division: "I", conference: "AAC", knownFor: ["Basketball"], cultureScore: 4 },

  "mit": { division: "III", conference: "NEWMAC", cultureScore: 2 },
  "caltech": { division: "III", conference: "SCIAC", cultureScore: 1 },
  "williams": { division: "III", conference: "NESCAC", cultureScore: 3 },
  "amherst": { division: "III", conference: "NESCAC", cultureScore: 3 },
  "swarthmore": { division: "III", conference: "Centennial", cultureScore: 2 },
};

const DEFAULT_SPORTS = ["Football", "Basketball", "Soccer", "Baseball", "Track & Field"];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/university of\s+/, "")
    .replace(/\s+university$/, "")
    .replace(/\s+college$/, "")
    .replace(/[,\.]/g, "")
    .trim();
}

function findKnown(name: string): KnownEntry | null {
  const n = normalize(name);
  if (KNOWN[n]) return KNOWN[n];
  for (const key of Object.keys(KNOWN)) {
    if (n.includes(key)) return KNOWN[key];
  }
  return null;
}

function inferFromMeta(studentBody?: string, _setting?: string): { division: SportsDivision; cultureScore: number } {
  const sizeNum = parseInt((studentBody || "").replace(/[^0-9]/g, ""), 10) || 0;
  if (sizeNum >= 20000) return { division: "I", cultureScore: 4 };
  if (sizeNum >= 8000) return { division: "I", cultureScore: 3 };
  if (sizeNum >= 3000) return { division: "II", cultureScore: 3 };
  return { division: "III", cultureScore: 2 };
}

const ALL_TEAM_SPORTS = [
  "Football", "Basketball", "Soccer", "Baseball",
  "Lacrosse", "Track & Field", "Volleyball", "Tennis",
  "Swimming", "Hockey",
];

function buildTeams(
  division: SportsDivision,
  knownFor: string[],
  cultureScore: number,
): SportsTeam[] {
  return ALL_TEAM_SPORTS.map<SportsTeam>((sport) => {
    const isStar = knownFor.includes(sport);
    let competitiveness: SportsTeam["competitiveness"] = "Moderate";
    let recruitment: SportsTeam["recruitment"] = "Competitive";
    if (isStar) {
      competitiveness = cultureScore >= 5 ? "Elite" : "High";
      recruitment = "Elite";
    } else if (cultureScore <= 2) {
      competitiveness = "Low";
      recruitment = "Walk-on friendly";
    } else if (cultureScore === 3) {
      competitiveness = "Moderate";
      recruitment = "Walk-on friendly";
    }
    return {
      sport,
      division,
      competitiveness,
      recruitment,
      ranking: isStar ? "Top 25 program" : undefined,
    };
  });
}

export function getCollegeSports(
  collegeName: string,
  studentBody?: string,
  setting?: string,
): CollegeSports {
  const known = findKnown(collegeName);
  const inferred = inferFromMeta(studentBody, setting);

  const division = known?.division ?? inferred.division;
  const conference = known?.conference ?? (division === "III" ? "Regional D-III" : "Independent / Regional");
  const cultureScore = known?.cultureScore ?? inferred.cultureScore;
  const knownFor = known?.knownFor ?? [];
  const mascot = known?.mascot;
  const colors = known?.colors;

  const popular = Array.from(new Set([...(knownFor || []), ...DEFAULT_SPORTS])).slice(0, 6);

  const gameDay =
    cultureScore >= 5
      ? "Electric, packed-stadium energy. Game days define the campus."
      : cultureScore >= 4
        ? "High-energy game days with strong student turnout."
        : cultureScore >= 3
          ? "Active sports scene with engaged student fans."
          : "Lower-key athletics — sports complement, not define, the culture.";

  const badges: string[] = [];
  if (cultureScore >= 4) badges.push("Strong Sports Culture");
  if (cultureScore >= 5) badges.push("Big Game Atmosphere");
  if (division === "I") badges.push("Competitive Programs");
  badges.push("Student-Athlete Support");

  const teams = buildTeams(division, knownFor, cultureScore);

  const achievements = known?.achievements ?? (
    knownFor.length > 0
      ? [
          `Multiple conference titles in ${knownFor[0]}`,
          `Recurring NCAA tournament appearances`,
          `Has produced professional athletes`,
        ]
      : [
          `Active in ${conference} competition`,
          `Steady program with regional success`,
        ]
  );

  const facilities = known?.facilities ?? (
    division === "I"
      ? [
          "Main stadium / arena for marquee sports",
          "Dedicated student-athlete training center",
          "Modern fitness & recovery facilities",
          "Multiple practice fields and courts",
        ]
      : [
          "Campus athletic center & gym",
          "Practice fields shared across teams",
          "Student fitness facilities",
        ]
  );

  const experienceNotes =
    cultureScore >= 4
      ? "Big student section, popular tailgates, and strong school-spirit traditions. Intramural and club leagues are widely played."
      : cultureScore === 3
        ? "Active intramural and club scene. Game attendance grows around rivalry weeks."
        : "Sports are casual — strong intramural and recreational options for students who want to stay active.";

  return {
    division,
    conference,
    mascot,
    colors,
    popularSports: popular,
    cultureScore,
    gameDay,
    badges,
    knownFor,
    teams,
    achievements,
    facilities,
    experienceNotes,
  };
}


/** Emoji for a sport name — used for compact card row */
export function sportEmoji(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("football")) return "🏈";
  if (s.includes("basketball")) return "🏀";
  if (s.includes("soccer")) return "⚽";
  if (s.includes("baseball") || s.includes("softball")) return "⚾";
  if (s.includes("lacrosse")) return "🥍";
  if (s.includes("hockey")) return "🏒";
  if (s.includes("track") || s.includes("running")) return "🏃";
  if (s.includes("swim")) return "🏊";
  if (s.includes("tennis")) return "🎾";
  if (s.includes("volleyball")) return "🏐";
  if (s.includes("wrestl")) return "🤼";
  if (s.includes("row")) return "🚣";
  if (s.includes("ski")) return "⛷️";
  return "🏅";
}

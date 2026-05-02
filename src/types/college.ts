/**
 * Shared college data types used across the app.
 * 
 * DATA FLOW:
 *   Tally Survey → Survey.tsx (parse) → college-match edge function
 *     → College Scorecard API → AI ranking → QuizResults.tsx (render)
 * 
 * COLLEGE SCORECARD API FIELDS USED:
 * ┌─────────────────────────────────────────────────────────┬───────────────────────────────┐
 * │ Scorecard API Field                                     │ Maps To                       │
 * ├─────────────────────────────────────────────────────────┼───────────────────────────────┤
 * │ school.name                                             │ College.name                  │
 * │ school.city + school.state                              │ College.location              │
 * │ school.school_url                                       │ (available, not yet displayed) │
 * │ school.ownership                                        │ (Public/Private indicator)    │
 * │ school.locale                                           │ College.setting               │
 * │ latest.student.size                                     │ College.studentBody           │
 * │ latest.admissions.admission_rate.overall                │ College.acceptanceRate         │
 * │ latest.admissions.sat_scores.average.overall            │ fitCategory calculation        │
 * │ latest.admissions.sat_scores.{25th,75th}_percentile.*   │ fitCategory calculation        │
 * │ latest.admissions.act_scores.{25th,75th,midpoint}.*     │ fitCategory calculation        │
 * │ latest.cost.tuition.in_state                            │ College.tuitionInState (💎)    │
 * │ latest.cost.tuition.out_of_state                        │ College.tuitionOutOfState (💎) │
 * │ latest.cost.avg_net_price.overall                       │ College.netPrice              │
 * │ latest.aid.median_debt.completers.overall               │ (available, not yet displayed) │
 * │ latest.aid.pell_grant_rate                              │ (used in AI prompt)           │
 * │ latest.completion.rate_suppressed.overall               │ College.graduationRate (💎)    │
 * │ latest.earnings.10_yrs_after_entry.median               │ College.avgStartingSalary (💎) │
 * │ latest.academics.program_percentage.*                   │ College.topPrograms           │
 * └─────────────────────────────────────────────────────────┴───────────────────────────────┘
 * 💎 = Premium-gated (masked as "Premium" for free users)
 *
 * DATABASE (survey_submissions):
 *   - id: uuid
 *   - email: text (nullable)
 *   - preferences: jsonb (raw parsed Tally answers)
 *   - created_at: timestamptz
 *
 * ADDING A BACKUP DATA SOURCE:
 *   1. Create a new provider function in college-match/index.ts following the
 *      CollegeDataProvider interface pattern (fetchColleges + formatForAI)
 *   2. Add a fallback call in the main handler when Scorecard returns <5 results
 *   3. The AI prompt already handles mixed data — just append the backup data string
 */

/** College as returned by the edge function and rendered in QuizResults */
export type College = {
  name: string;
  location: string;
  acceptanceRate: string;
  ranking: string;
  tuitionInState: string;       // Premium
  tuitionOutOfState: string;    // Premium
  avgFinancialAid: string;      // Premium
  netPrice: string;
  topPrograms: string[];
  campusSize: string;           // Premium
  studentBody: string;          // Premium
  studentFacultyRatio: string;  // Premium
  setting: string;
  graduationRate: string;       // Premium
  avgStartingSalary: string;    // Premium
  fitScore: number;
  fitCategory: "Safety" | "Match" | "Reach";
  whyFit: string;
  prosForStudent: string[];
  consForStudent: string[];
  challengesForStudent: string[];
  howToGetIn: string;
  campusVibe: string;
  notableFeature: string;
  realismNote: string;
};

/** Full recommendations payload from college-match edge function */
export type Recommendations = {
  studentProfile: {
    summary: string;
    topPriorities: string[];
    idealSchoolType: string;
  };
  colleges: College[];
  comparisonInsight: string;
};

/** Student preferences as sent to the edge function */
export type StudentPreferences = {
  email?: string;
  cityState: string;
  gpa: string;
  testScore: string;
  satScore: string;
  actScore: string;
  campusSize: string;
  campusVibe: string;
  locationType: string;
  maxCost: string;
  acceptanceRatePref: string;
  financialAid: string;
  campusLife: string;
  academicImportance: string;
  distanceFromHome: string;
  weatherRegion: string;
  listMode: string;
  areaOfStudy: string;
  activities?: string;
  customMajor?: string;
  allResponses?: Record<string, string>;
};

/**
 * Interface for adding additional data providers.
 * 
 * To add a backup source (e.g., IPEDS, Peterson's, Niche):
 * 
 *   const myBackupProvider: CollegeDataProvider = {
 *     name: "MyBackup",
 *     fetchColleges: async (prefs) => { ... },
 *     formatForAI: (results) => { ... },
 *   };
 */
export type CollegeDataProvider = {
  name: string;
  fetchColleges: (preferences: StudentPreferences) => Promise<unknown[]>;
  formatForAI: (results: unknown[]) => string;
};

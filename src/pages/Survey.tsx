import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { capture } from "@/lib/posthog";

const loadingMessages = [
  "Analyzing your preferences...",
  "Searching 6,000+ institutions...",
  "Matching campus vibes...",
  "Comparing financial fit...",
  "Ranking your top picks...",
];

const Survey = () => {
  const { user, loading: authLoading, isSubscribed } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { state: { from: "/survey" } });
    }
  }, [user, authLoading, navigate]);

  // Free users can only take the quiz once — redirect if they already have results
  useEffect(() => {
    if (authLoading || !user || isSubscribed) return;
    const checkExisting = async () => {
      const { data } = await supabase
        .from("college_matches")
        .select("id, ai_status, college_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const match = data[0] as any;
        const hasResults = match.ai_status === "completed" && Array.isArray(match.college_data) && match.college_data.length > 0;
        if (hasResults) {
          try {
            sessionStorage.setItem("latest_college_match_id", match.id);
          } catch {
            // Ignore storage failures
          }
          navigate(`/quiz-results?match_id=${match.id}`, { replace: true });
        }
      }
    };
    checkExisting();
  }, [user, authLoading, isSubscribed, navigate]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const isProcessingSubmissionRef = useRef(false);
  const hasNavigatedToResultsRef = useRef(false);

  // Cycle loading messages while submitting
  useEffect(() => {
    if (!isSubmitting) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isSubmitting]);

  // Track elapsed time so we can surface "taking longer than usual" UX
  useEffect(() => {
    if (!isSubmitting) {
      setElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    const t = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [isSubmitting]);

  useEffect(() => {
    const submissionEvents = new Set([
      "tally.formsubmitted",
      "tally.form-submitted",
      "formsubmitted",
      "form-submitted",
    ]);

    const isTallySubmissionEvent = (value: unknown) => {
      if (typeof value !== "string") return false;
      const normalized = value.toLowerCase().trim();
      return submissionEvents.has(normalized);
    };

    const parseTallyMessage = (rawData: unknown): Record<string, any> | null => {
      if (typeof rawData === "string") {
        if (!rawData.toLowerCase().includes("tally.form")) return null;
        try {
          const parsed = JSON.parse(rawData);
          const eventName = parsed?.event || parsed?.eventType || parsed?.type;
          return isTallySubmissionEvent(eventName) ? parsed : null;
        } catch {
          return null;
        }
      }

      if (typeof rawData === "object" && rawData !== null) {
        const data = rawData as Record<string, any>;
        const eventName = data.event || data.eventType || data.type;
        if (isTallySubmissionEvent(eventName)) return data;

        if (typeof data.data === "object" && data.data !== null) {
          const nested = data.data as Record<string, any>;
          const nestedEventName = nested.event || nested.eventType || nested.type;
          if (isTallySubmissionEvent(nestedEventName)) return nested;
        }
      }

      return null;
    };

    const handleMessage = async (event: MessageEvent) => {
      const parsed = parseTallyMessage(event.data);
      if (!parsed || hasNavigatedToResultsRef.current) return;

      const payload = parsed.payload || parsed.data || parsed;
      const fields = payload?.fields || payload?.formResponse?.fields || payload?.answers || [];

      const hasFieldValues =
        Array.isArray(fields) &&
        fields.some((field: any) => {
          if (!field || typeof field !== "object") return false;
          return (
            (field.value !== undefined && field.value !== null && String(field.value).trim() !== "") ||
            (field.answer !== undefined && field.answer !== null && String(field.answer).trim() !== "") ||
            (Array.isArray(field.options) && field.options.length > 0) ||
            (Array.isArray(field.choices) && field.choices.length > 0)
          );
        });

      if (!Array.isArray(fields) || fields.length === 0 || !hasFieldValues) {
        console.warn("Ignoring Tally submission event without answer fields");
        return;
      }

      if (isProcessingSubmissionRef.current) {
        console.warn("Ignoring duplicate Tally submission event while processing");
        return;
      }

      isProcessingSubmissionRef.current = true;

      try {
        setIsSubmitting(true);
        capture("quiz_started");
        console.log("Tally payload:", JSON.stringify(parsed, null, 2));

        // ── Scored keyword mapping ──
        // Each rule lists weighted phrases. The rule with the highest score wins,
        // and we require a minimum score so weak partial matches don't mis-route.
        // Order in `rules` is also the tie-break order (more specific first).
        type Rule = { paramKey: string; phrases: Array<[string, number]>; minScore?: number };
        const rules: Rule[] = [
          // Custom-major must come BEFORE area_of_study so "type your major" wins.
          { paramKey: "custom_major", phrases: [
            ["isn't listed", 6], ["isn t listed", 6], ["not listed", 6],
            ["type it here", 6], ["type your major", 5], ["type the major", 5],
            ["other major", 4], ["specify", 3],
          ], minScore: 4 },
          { paramKey: "first_name", phrases: [["first name", 6], ["your name", 4], ["what's your name", 4], ["whats your name", 4]] },
          { paramKey: "email", phrases: [["email", 6]] },
          { paramKey: "city_state", phrases: [
            ["city and state", 8], ["city, state", 8], ["city/state", 8],
            ["where do you live", 6], ["hometown", 5], ["city", 3], ["state", 2],
          ], minScore: 5 },
          { paramKey: "gpa", phrases: [["gpa", 8], ["grade point", 6]] },
          { paramKey: "sat_score", phrases: [["sat score", 8], ["sat ", 6], [" sat", 6]] },
          { paramKey: "act_score", phrases: [["act score", 8], ["act ", 6], [" act", 6]] },
          { paramKey: "test_score", phrases: [
            ["which test", 6], ["sat or act", 8], ["test did you take", 6],
            ["standardized test", 5], ["test score", 4],
          ], minScore: 4 },
          { paramKey: "campus_size", phrases: [
            ["campus size", 8], ["school size", 8], ["student body size", 7],
            ["how big", 5], ["size of", 4],
          ], minScore: 4 },
          { paramKey: "campus_vibe", phrases: [
            ["campus vibe", 8], ["campus environment", 8], ["campus feel", 7],
            ["vibe", 4], ["atmosphere", 4], ["personality", 3],
          ], minScore: 4 },
          { paramKey: "location_type", phrases: [
            ["type of location", 9], ["urban or rural", 8], ["urban, suburban", 8],
            ["setting", 5], ["location type", 7], ["location", 3],
          ], minScore: 4 },
          { paramKey: "weather_region", phrases: [
            ["weather", 5], ["climate", 5], ["region", 4],
            ["part of the country", 6], ["northeast", 3], ["midwest", 3], ["south", 2], ["west", 2],
          ], minScore: 4 },
          { paramKey: "list_mode", phrases: [
            ["types of colleges", 8], ["looking to apply", 6], ["list mode", 8],
            ["safe", 2], ["dream", 2], ["balanced", 2], ["ambitious", 2], ["practical", 2],
            ["mix of colleges", 6], ["kind of list", 6],
          ], minScore: 5 },
          { paramKey: "max_cost", phrases: [
            ["willing to pay", 8], ["maximum cost", 8], ["max cost", 8],
            ["budget", 6], ["how much", 4], ["cost", 3], ["pay", 2],
          ], minScore: 5 },
          { paramKey: "acceptance_rate_pref", phrases: [
            ["acceptance rate", 8], ["selectivity", 7], ["how selective", 7],
            ["selective", 4],
          ], minScore: 4 },
          { paramKey: "financial_aid", phrases: [
            ["financial aid", 8], ["scholarship", 6], ["aid", 3],
          ], minScore: 4 },
          { paramKey: "campus_life", phrases: [
            ["campus life", 8], ["outside of academics", 7], ["outside academics", 7],
            ["social life", 6], ["student life", 6],
          ], minScore: 4 },
          { paramKey: "academic_importance", phrases: [
            ["how important", 5], ["academics", 5], ["academic rigor", 8],
            ["rigor", 5], ["important are academics", 9],
          ], minScore: 6 },
          { paramKey: "distance_from_home", phrases: [
            ["far from home", 9], ["distance from home", 9], ["how far", 6],
            ["from home", 5], ["distance", 4],
          ], minScore: 5 },
          { paramKey: "area_of_study", phrases: [
            ["area of study", 9], ["areas of study", 9], ["academic areas", 8],
            ["interest you the most", 7], ["field of study", 8], ["intended major", 8],
            ["what do you want to study", 8], ["major", 4], ["study", 2],
          ], minScore: 5 },
          { paramKey: "activities", phrases: [
            ["are you in any activities", 9], ["planning to go", 6], ["extracurricular", 8],
            ["activities", 5], ["clubs or sports", 7], ["hobbies", 4],
          ], minScore: 4 },
        ];

        const scoreRule = (title: string, phrases: Array<[string, number]>): number => {
          let total = 0;
          for (const [phrase, weight] of phrases) {
            if (title.includes(phrase)) total += weight;
          }
          return total;
        };

        const findParamKey = (title: string): string | null => {
          const lower = " " + title.toLowerCase().replace(/[^\w\s/]/g, " ").replace(/\s+/g, " ") + " ";
          let bestKey: string | null = null;
          let bestScore = 0;
          for (const rule of rules) {
            const s = scoreRule(lower, rule.phrases);
            const min = rule.minScore ?? 4;
            if (s >= min && s > bestScore) {
              bestScore = s;
              bestKey = rule.paramKey;
            }
          }
          return bestKey;
        };

        const extractText = (v: any): string => {
          if (v === undefined || v === null) return "";
          if (typeof v === "string") return v;
          if (typeof v === "number" || typeof v === "boolean") return String(v);
          if (Array.isArray(v)) return v.map(extractText).filter(Boolean).join(", ");
          if (typeof v === "object") {
            const preferredKeys = ["text", "name", "label", "value", "answer", "title"];
            for (const key of preferredKeys) {
              if (key in v) {
                const extracted = extractText(v[key]);
                if (extracted) return extracted;
              }
            }
            const values = Object.values(v).map(extractText).filter(Boolean);
            return values.join(", ");
          }
          return String(v);
        };

        const preferencesData: Record<string, string> = {};

        for (const field of fields) {
          const rawTitle = (field.title || field.label || field.question || field.name || "").toLowerCase().trim();
          if (!rawTitle) continue;
          const normalizedTitle = rawTitle.replace(/[?\s]+$/, "").trim();

          let value = "";
          if (field.value !== undefined && field.value !== null) {
            value = extractText(field.value);
          }
          if (!value && field.answer !== undefined && field.answer !== null) {
            value = extractText(field.answer);
          }
          if (!value && Array.isArray(field.options)) {
            value = field.options.map((o: any) => extractText(o)).filter(Boolean).join(", ");
          }
          if (!value && Array.isArray(field.choices)) {
            value = field.choices.map((o: any) => extractText(o)).filter(Boolean).join(", ");
          }

          if (value) {
            const paramKey = findParamKey(rawTitle) || findParamKey(normalizedTitle);
            if (paramKey) {
              preferencesData[paramKey] = value;
            } else {
              const key = normalizedTitle.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
              if (key) {
                preferencesData[key] = value;
              }
            }
          }
        }

        // Persist latest parsed answers in sessionStorage as fallback
        if (Object.keys(preferencesData).length > 0) {
          try {
            sessionStorage.setItem(
              "latest_survey_preferences",
              JSON.stringify({ responses: preferencesData, savedAt: Date.now() })
            );
          } catch (storageErr) {
            console.warn("Unable to persist survey preferences in sessionStorage", storageErr);
          }
        }

        // Guard: reject empty submissions
        if (Object.keys(preferencesData).length === 0) {
          console.warn("[Survey] Empty submission — ignoring");
          setIsSubmitting(false);
          isProcessingSubmissionRef.current = false;
          return;
        }

        // Save to survey_submissions (audit trail)
        const email = preferencesData.email || null;
        await supabase.from("survey_submissions").insert({
          email,
          preferences: preferencesData,
        });

        // ── Save raw quiz answers to quiz_answers table ──
        if (user) {
          // Dedup: check for recent quiz_answers within 2 minutes
          const { data: recentAnswers } = await supabase
            .from("quiz_answers" as any)
            .select("id")
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .limit(1);

          if (!recentAnswers || recentAnswers.length === 0) {
            const { error: qaError } = await supabase
              .from("quiz_answers" as any)
              .insert({ user_id: user.id, answers: preferencesData } as any);
            if (qaError) {
              console.error("[Survey] Failed to save quiz answers:", qaError);
            } else {
              console.log("[Survey] Quiz answers saved to quiz_answers table");
            }
          } else {
            console.log("[Survey] Skipping duplicate quiz_answers insert");
          }
        }

        // Build preferences object for the edge function
        const clean = (val: string | undefined, fallback: string): string => {
          if (!val) return fallback;
          const trimmed = val.trim();
          if (!trimmed || /^\{.*\}$/.test(trimmed)) return fallback;
          return trimmed;
        };

        const pick = (...keys: string[]) => {
          for (const key of keys) {
            const value = preferencesData[key];
            if (typeof value === "string" && value.trim()) return value;
          }
          return "";
        };

        const cleanedResponses: Record<string, string> = {};
        for (const [key, val] of Object.entries(preferencesData)) {
          const cleaned = clean(val, "");
          if (cleaned) cleanedResponses[key] = cleaned;
        }

        const preferences = {
          firstName: pick("first_name", "firstName"),
          email: pick("email"),
          cityState: clean(pick("city_state", "cityState"), "No preference"),
          gpa: clean(pick("gpa"), ""),
          testScore: clean(pick("test_score", "testScore"), "None"),
          satScore: clean(pick("sat_score", "satScore"), ""),
          actScore: clean(pick("act_score", "actScore"), ""),
          campusSize: clean(pick("campus_size", "campusSize"), "No preference"),
          campusVibe: clean(pick("campus_vibe", "campusVibe"), "No preference"),
          locationType: clean(pick("location_type", "locationType"), "No preference"),
          maxCost: clean(pick("max_cost", "maxCost"), "No preference"),
          acceptanceRatePref: clean(pick("acceptance_rate_pref", "acceptanceRatePref"), "No preference"),
          financialAid: clean(pick("financial_aid", "financialAid"), "Important"),
          campusLife: clean(pick("campus_life", "campusLife"), "No preference"),
          academicImportance: clean(pick("academic_importance", "academicImportance"), "No preference"),
          distanceFromHome: clean(pick("distance_from_home", "distanceFromHome"), "No preference"),
          weatherRegion: clean(pick("weather_region", "weatherRegion"), "No preference"),
          listMode: clean(pick("list_mode", "listMode"), "Balanced"),
          areaOfStudy: (() => {
            const primary = clean(pick("area_of_study", "areaOfStudy"), "");
            const custom = clean(pick("custom_major", "customMajor"), "");
            // If user typed a custom major and primary is empty / Undecided, prefer custom
            if (custom && (!primary || /undecided/i.test(primary))) return custom;
            // If both, append the custom for additional specificity
            if (custom && primary) return `${primary} (specifically: ${custom})`;
            return primary || "Undecided";
          })(),
          activities: clean(pick("activities"), ""),
          customMajor: clean(pick("custom_major", "customMajor"), ""),
          allResponses: cleanedResponses,
        };

        // Deduplication: check for recent pending/processing match
        if (user) {
          const { data: recentMatches } = await supabase
            .from("college_matches")
            .select("*")
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1);

          if (recentMatches && recentMatches.length > 0) {
            const recent = recentMatches[0] as any;
            if (recent.ai_status === "pending" || recent.ai_status === "processing") {
              console.log("[Survey] Found recent pending match, redirecting:", recent.id);
              try {
                sessionStorage.setItem("latest_college_match_id", recent.id);
              } catch {
                // Ignore storage failures
              }
              hasNavigatedToResultsRef.current = true;
              navigate(`/quiz-results?match_id=${recent.id}`, { replace: true });
              return;
            }
          }
        }

        // Save pending match record to database FIRST
        const insertPayload: any = {
          user_id: user!.id,
          raw_preferences: preferencesData,
          ai_status: "pending",
          college_data: [],
          student_profile: {},
        };

        const { data: matchRow, error: insertError } = await supabase
          .from("college_matches")
          .insert(insertPayload)
          .select("id")
          .single();

        if (insertError || !matchRow) {
          console.error("[Survey] Failed to create match record:", insertError);
          throw new Error("Failed to save your submission. Please try again.");
        }

        const matchId = matchRow.id;
        console.log("[Survey] Created match record:", matchId);
        try {
          sessionStorage.setItem("latest_college_match_id", matchId);
        } catch {
          // Ignore storage failures
        }

        // Premium retake: collect previously matched college names so the engine
        // returns different (but still accurate) schools each retake.
        let excludeColleges: string[] = [];
        if (isSubscribed && user) {
          try {
            const { data: prior } = await supabase
              .from("college_matches")
              .select("college_data")
              .eq("user_id", user.id)
              .eq("ai_status", "completed")
              .order("created_at", { ascending: false })
              .limit(3);
            if (Array.isArray(prior)) {
              const names = new Set<string>();
              for (const row of prior as any[]) {
                const cd = Array.isArray(row?.college_data) ? row.college_data : [];
                for (const c of cd) {
                  const n = c?.name || c?.collegeName;
                  if (typeof n === "string" && n.trim()) names.add(n.trim());
                }
              }
              excludeColleges = Array.from(names).slice(0, 20);
              console.log(`[Survey] Premium retake — excluding ${excludeColleges.length} prior matches`);
            }
          } catch (e) {
            console.warn("[Survey] Failed to load prior matches for exclude list", e);
          }
        }

        // Fire edge function in background — QuizResults will poll for completion
        supabase.functions.invoke("college-match", {
          body: { preferences, matchId, excludeColleges },
        }).then(({ error: fnError }) => {
          if (fnError) console.error("[Survey] Edge function error:", fnError);
          else console.log("[Survey] Edge function completed for match:", matchId);
        }).catch(err => console.error("[Survey] Edge function call failed:", err));

        // Navigate immediately — results page will poll DB
        capture("quiz_completed", { matchId });
        hasNavigatedToResultsRef.current = true;
        navigate(`/quiz-results?match_id=${matchId}`, { replace: true });
      } catch (err) {
        console.error("Error processing survey submission:", err);
        setIsSubmitting(false);
      } finally {
        if (!hasNavigatedToResultsRef.current) {
          isProcessingSubmissionRef.current = false;
        }
      }
    };

    const wrappedHandler = (event: MessageEvent) => {
      const isTrustedTallyOrigin = /^https:\/\/([a-z0-9-]+\.)?tally\.so$/i.test(event.origin);
      if (!isTrustedTallyOrigin) return;
      handleMessage(event);
    };

    window.addEventListener("message", wrappedHandler);
    return () => window.removeEventListener("message", wrappedHandler);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {isSubmitting ? (
        <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-4">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-display text-2xl font-bold text-primary tabular-nums leading-none"
                aria-live="polite"
                aria-label={`${elapsedSec} seconds elapsed`}
              >
                {elapsedSec}s
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">elapsed</span>
            </div>
          </div>
          <p className="text-foreground text-lg font-semibold text-center">
            {loadingMessages[loadingMsgIndex]}
          </p>
          <div className="w-full max-w-xs h-2 rounded-full bg-border/60 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(95, Math.round((elapsedSec / 25) * 100))}>
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.min(95, Math.round((elapsedSec / 25) * 100))}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Most matches finish in under 25 seconds. Please don't close this page.
          </p>
          {elapsedSec >= 20 && elapsedSec < 40 && (
            <p className="text-muted-foreground text-xs text-center max-w-md mt-1">
              Almost there — finalizing your top picks ({elapsedSec}s)
            </p>
          )}
          {elapsedSec >= 40 && (
            <p className="text-foreground/80 text-xs text-center max-w-md mt-1">
              Still working… we'll move you to your results as soon as they're ready ({elapsedSec}s)
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="container px-4 py-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 min-h-[44px]">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
          <div className="w-full h-[calc(100vh-80px)]">
            <iframe
              src="https://tally.so/r/7RK08z"
              width="100%"
              height="100%"
              frameBorder="0"
              title="Collegra Survey"
              className="w-full h-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Survey;

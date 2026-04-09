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

        // Keyword-based mapping
        const keywordMap: Array<{ keywords: string[]; paramKey: string }> = [
          { keywords: ["first name", "name"], paramKey: "first_name" },
          { keywords: ["email"], paramKey: "email" },
          { keywords: ["city", "state"], paramKey: "city_state" },
          { keywords: ["gpa"], paramKey: "gpa" },
          { keywords: ["sat", "score"], paramKey: "sat_score" },
          { keywords: ["act", "score"], paramKey: "act_score" },
          { keywords: ["test", "score"], paramKey: "test_score" },
          { keywords: ["campus size", "size"], paramKey: "campus_size" },
          { keywords: ["vibe"], paramKey: "campus_vibe" },
          { keywords: ["campus environment"], paramKey: "campus_vibe" },
          { keywords: ["location", "type of location"], paramKey: "location_type" },
          { keywords: ["weather", "region"], paramKey: "weather_region" },
          { keywords: ["types of colleges", "looking to apply"], paramKey: "list_mode" },
          { keywords: ["maximum", "pay", "cost", "willing to pay"], paramKey: "max_cost" },
          { keywords: ["acceptance rate"], paramKey: "acceptance_rate_pref" },
          { keywords: ["financial aid", "scholarships"], paramKey: "financial_aid" },
          { keywords: ["campus life", "outside of academics"], paramKey: "campus_life" },
          { keywords: ["how important", "academics"], paramKey: "academic_importance" },
          { keywords: ["far", "home", "distance"], paramKey: "distance_from_home" },
          { keywords: ["area of study", "study", "major"], paramKey: "area_of_study" },
        ];

        const findParamKey = (title: string): string | null => {
          const lower = title.toLowerCase();
          for (const { keywords, paramKey } of keywordMap) {
            if (keywords.every((kw) => lower.includes(kw))) return paramKey;
          }
          for (const { keywords, paramKey } of keywordMap) {
            if (keywords.some((kw) => lower.includes(kw))) return paramKey;
          }
          return null;
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
          areaOfStudy: clean(pick("area_of_study", "areaOfStudy"), "Undecided"),
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

        // Fire edge function in background — QuizResults will poll for completion
        supabase.functions.invoke("college-match", {
          body: { preferences, matchId },
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
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-foreground text-lg font-semibold text-center">
            {loadingMessages[loadingMsgIndex]}
          </p>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            This usually takes 15–30 seconds. Please don't close this page.
          </p>
        </div>
      ) : (
        <>
          <div className="container px-4 py-6">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
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

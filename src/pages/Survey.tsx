import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Survey = () => {
  const navigate = useNavigate();

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

    const handleMessage = (event: MessageEvent) => {
      const parsed = parseTallyMessage(event.data);
      if (!parsed) return;

      try {
        console.log("Tally payload:", JSON.stringify(parsed, null, 2));
        const payload = parsed.payload || parsed.data || parsed;
        const fields = payload?.fields || payload?.formResponse?.fields || payload?.answers || [];
        const params = new URLSearchParams();

        // Keyword-based mapping: if a field title contains these keywords, map to param key
        const keywordMap: Array<{ keywords: string[]; paramKey: string }> = [
          { keywords: ["email"], paramKey: "email" },
          { keywords: ["city", "state"], paramKey: "city_state" },
          { keywords: ["gpa"], paramKey: "gpa" },
          { keywords: ["sat", "score"], paramKey: "sat_score" },
          { keywords: ["act", "score"], paramKey: "act_score" },
          { keywords: ["test", "score"], paramKey: "test_score" },
          { keywords: ["campus size", "size"], paramKey: "campus_size" },
          { keywords: ["vibe"], paramKey: "campus_vibe" },
          { keywords: ["location", "type of location"], paramKey: "location_type" },
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
          // Single keyword fallback
          for (const { keywords, paramKey } of keywordMap) {
            if (keywords.some((kw) => lower.includes(kw))) return paramKey;
          }
          return null;
        };

        // Extract a plain string from Tally's various value shapes
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

        for (const field of fields) {
          // Tally may use title/label/question/name for field names
          const rawTitle = (field.title || field.label || field.question || field.name || "").toLowerCase().trim();
          if (!rawTitle) continue;

          // Normalize: remove trailing punctuation
          const normalizedTitle = rawTitle.replace(/[?\s]+$/, "").trim();

          let value = "";
          // Tally fields may have: value (string/object), answer, options, choices
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
              params.set(paramKey, value);
            } else {
              // Fallback: sanitize the title as a key
              const key = normalizedTitle.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
              if (key) params.set(key, value);
            }
          }
        }

        console.log("Navigating with params:", params.toString());
        navigate(`/quiz-results?${params.toString()}`, { replace: true });
      } catch {
        // Not a supported Tally message shape, ignore
      }
    };

    const wrappedHandler = (event: MessageEvent) => {
      // Accept Tally message origins, including subdomains used by embedded forms
      const isTrustedTallyOrigin = /^https:\/\/([a-z0-9-]+\.)?tally\.so$/i.test(event.origin);
      if (!isTrustedTallyOrigin) return;
      handleMessage(event);
    };

    window.addEventListener("message", wrappedHandler);
    return () => window.removeEventListener("message", wrappedHandler);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
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
    </div>
  );
};

export default Survey;
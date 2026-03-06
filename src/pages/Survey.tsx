import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Survey = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Tally sends a postMessage when the form is submitted
      if (typeof event.data === "string" && event.data.includes("Tally.FormSubmitted")) {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === "Tally.FormSubmitted") {
            console.log("Tally payload:", JSON.stringify(parsed.payload, null, 2));
            const fields = parsed.payload?.fields || [];
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
                if (keywords.every(kw => lower.includes(kw))) return paramKey;
              }
              // Single keyword fallback
              for (const { keywords, paramKey } of keywordMap) {
                if (keywords.some(kw => lower.includes(kw))) return paramKey;
              }
              return null;
            };

            for (const field of fields) {
              // Tally uses "title" not "label" for field names
              const rawTitle = (field.title || field.label || "").toLowerCase().trim();
              // Normalize: remove trailing punctuation
              const normalizedTitle = rawTitle.replace(/[?\s]+$/, "").trim();
              
              // Extract a plain string from Tally's various value shapes
              const extractText = (v: any): string => {
                if (v === undefined || v === null) return "";
                if (typeof v === "string") return v;
                if (typeof v === "number" || typeof v === "boolean") return String(v);
                if (Array.isArray(v)) return v.map(extractText).filter(Boolean).join(", ");
                if (typeof v === "object") {
                  // Tally option objects: { text, name, label, value }
                  return v.text || v.name || v.label || (typeof v.value === "string" ? v.value : "") || JSON.stringify(v);
                }
                return String(v);
              };

              let value = "";
              // Tally fields may have: value (string or object), answer, options
              if (field.value !== undefined && field.value !== null) {
                value = extractText(field.value);
              }
              if (!value && field.answer !== undefined && field.answer !== null) {
                value = extractText(field.answer);
              }
              if (!value && Array.isArray(field.options)) {
                value = field.options.map((o: any) => extractText(o)).filter(Boolean).join(", ");
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
            navigate(`/quiz-results?${params.toString()}`);
          }
        } catch {
          // Not a JSON message, ignore
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
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
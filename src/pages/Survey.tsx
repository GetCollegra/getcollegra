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
              { keywords: ["sat", "act", "score"], paramKey: "test_score" },
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
              
              // Extract value: Tally may use value, answer, or options
              let value = "";
              if (field.value !== undefined && field.value !== null) {
                value = String(field.value);
              } else if (field.answer !== undefined && field.answer !== null) {
                value = String(field.answer);
              } else if (Array.isArray(field.options)) {
                value = field.options.map((o: any) => o.text || o.name || o).join(", ");
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
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

            // Map Tally field titles (lowercased, trimmed, no trailing ?) to URL param keys
            const fieldMap: Record<string, string> = {
              // Q1-Q4: Basic info
              "what's your email address": "email",
              "what's your city and state": "city_state",
              "what's your weighted gpa": "gpa",
              "what's your sat or act score? (none if unknown)": "test_score",
              "what's your sat or act score (none if unknown)": "test_score",
              // Q5-Q7: Campus preferences
              "what campus size are you interested in": "campus_size",
              "what kind of campus vibe are you looking for": "campus_vibe",
              "what type of location do you want your college to be in": "location_type",
              // Q8: Cost
              "what is the maximum amount you're willing to pay per year for college": "max_cost",
              // Q9: Admissions
              "what acceptance rate are you comfortable applying to": "acceptance_rate_pref",
              // Q10: Financial aid
              "how important is financial aid and scholarships in your decision": "financial_aid",
              // Q11: Campus life
              "outside of academics, which parts of campus life matter to you": "campus_life",
              // Q12: Academics
              "how important are academics in your college decision": "academic_importance",
              // Q13: Distance
              "how far are you willing to go from home (driving distance)": "distance_from_home",
              "how far are you willing to go from home": "distance_from_home",
              // Q14: Area of study
              "what general area of study are you most interested in": "area_of_study",
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
                // Try exact match on raw title, then normalized
                const paramKey = fieldMap[rawTitle] || fieldMap[normalizedTitle];
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
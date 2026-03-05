import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Survey = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Tally sends a postMessage when the form is submitted
      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === "Tally.FormSubmitted") {
            const fields = parsed.payload?.fields || [];
            const params = new URLSearchParams();

            // Map Tally field labels (lowercased) to URL param keys
            const fieldMap: Record<string, string> = {
              // Q1-Q4: Basic info
              "what's your email address?": "email",
              "what's your city and state?": "city_state",
              "what's your weighted gpa?": "gpa",
              "what's your sat or act score? (none if unknown)": "test_score",
              // Q5: Campus size
              "what campus size are you interested in?": "campus_size",
              "what campus size are you interested in": "campus_size",
              "campus size": "campus_size",
              // Q6: Campus vibe
              "what kind of campus vibe are you looking for?": "campus_vibe",
              "what kind of campus vibe are you looking for": "campus_vibe",
              "campus vibe": "campus_vibe",
              // Q7: Location type
              "what type of location do you want your college to be in?": "location_type",
              "what type of location do you want your college to be in": "location_type",
              "location type": "location_type",
              // Q8: Max cost
              "what is the maximum amount you're willing to pay per year for college?": "max_cost",
              "what is the maximum amount you're willing to pay per year for college": "max_cost",
              "maximum amount": "max_cost",
              // Q9: Acceptance rate
              "what acceptance rate are you comfortable applying to?": "acceptance_rate_pref",
              "what acceptance rate are you comfortable applying to": "acceptance_rate_pref",
              "acceptance rate": "acceptance_rate_pref",
              // Q10: Financial aid importance
              "how important is financial aid and scholarships in your decision?": "financial_aid",
              "how important is financial aid and scholarships in your decision": "financial_aid",
              "financial aid": "financial_aid",
              // Q11: Campus life
              "outside of academics, which parts of campus life matter to you?": "campus_life",
              "outside of academics, which parts of campus life matter to you": "campus_life",
              "campus life": "campus_life",
              // Q12: Academic importance
              "how important are academics in your college decision?": "academic_importance",
              "how important are academics in your college decision": "academic_importance",
              "academic importance": "academic_importance",
              // Q13: Distance from home
              "how far are you willing to go from home (driving distance)?": "distance_from_home",
              "how far are you willing to go from home (driving distance)": "distance_from_home",
              "how far are you willing to go from home": "distance_from_home",
              "distance from home": "distance_from_home",
              // Q14: Area of study
              "what general area of study are you most interested in?": "area_of_study",
              "what general area of study are you most interested in": "area_of_study",
              "area of study": "area_of_study",
              // Shortened variants
              "email address": "email",
              "city and state": "city_state",
              "weighted gpa": "gpa",
              "sat or act score": "test_score",
            };

            for (const field of fields) {
              const label = (field.label || "").toLowerCase().trim();
              // Remove trailing question mark and extra whitespace for matching
              const normalizedLabel = label.replace(/\?$/, "").trim();
              const value = field.value || (Array.isArray(field.options) ? field.options.map((o: any) => o.text).join(", ") : "");
              
              if (value) {
                // Try exact match first, then normalized (without ?)
                const paramKey = fieldMap[label] || fieldMap[normalizedLabel];
                if (paramKey) {
                  params.set(paramKey, String(value));
                } else {
                  // Use a sanitized version of the label as fallback
                  const key = normalizedLabel.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
                  if (key) params.set(key, String(value));
                }
              }
            }

            // Navigate to results with all collected params
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
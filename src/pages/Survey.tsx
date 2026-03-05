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

            // Map Tally field labels to our URL params
            const fieldMap: Record<string, string> = {
              "major": "major",
              "intended major": "major",
              "field of study": "major",
              "campus size": "campus_size",
              "school size": "campus_size",
              "location": "location",
              "preferred location": "location",
              "setting": "location",
              "budget": "budget",
              "academic interests": "academic_interests",
              "interests": "academic_interests",
              "extracurriculars": "extracurriculars",
              "activities": "extracurriculars",
              "region": "region",
              "climate": "region",
              "preferred region": "region",
              "financial aid": "financial_aid",
              "notes": "notes",
              "additional notes": "notes",
            };

            for (const field of fields) {
              const label = (field.label || "").toLowerCase().trim();
              const value = field.value || (Array.isArray(field.options) ? field.options.map((o: any) => o.text).join(", ") : "");
              
              if (value) {
                const paramKey = fieldMap[label];
                if (paramKey) {
                  params.set(paramKey, String(value));
                } else {
                  // Use a sanitized version of the label as fallback
                  const key = label.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
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
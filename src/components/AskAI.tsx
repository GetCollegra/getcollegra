import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type AskAIProps = {
  surveyContext?: Record<string, string>;
  recommendedCollegeNames?: string[];
};

const AskAI = ({ surveyContext = {}, recommendedCollegeNames = [] }: AskAIProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("https://hlpntgkgjjjcqrwgbvql.supabase.co/functions/v1/claude-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscG50Z2tnampqY3Fyd2didnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3Mjg2ODksImV4cCI6MjA4ODMwNDY4OX0.iJIBQI8e4AbXF5m4cxyAUKF8EAr3jLK8LqVsJTrGLvI",
        },
        body: JSON.stringify({
          question,
          surveyContext,
          recommendedCollegeNames,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Request failed");

      setAnswer(data.answer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const hasSurveyContext =
    Object.keys(surveyContext).length > 0 || recommendedCollegeNames.length > 0;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-foreground mb-2">
          Ask AI About Your Matches
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          {hasSurveyContext
            ? "Ask questions and get answers personalized to your survey responses and current matches."
            : "Have a question about the college process? Ask our AI assistant."}
        </p>

        <div className="space-y-4">
          <Textarea
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 2000))}
            rows={3}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground text-right">{question.length}/2000</p>
          <Button onClick={handleAsk} disabled={loading || !question.trim()} className="w-full">
            {loading ? "Thinking..." : "Ask"}
          </Button>

          {loading && (
            <p className="text-muted-foreground text-center animate-pulse">Thinking...</p>
          )}

          {answer && !loading && (
            <div className="rounded-xl border border-border bg-background p-5 shadow-soft">
              <p className="text-foreground whitespace-pre-wrap">{answer}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AskAI;

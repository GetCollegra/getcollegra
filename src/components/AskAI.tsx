import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const AskAI = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");
    setError(false);

    try {
      const res = await fetch(
        "https://hlpntgkgjjjcqrwgbvql.supabase.co/functions/v1/claude-qa",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        }
      );
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setAnswer(data.answer);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-foreground mb-2">
          Ask AI About College
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          Have a question about the college process? Ask our AI assistant.
        </p>

        <div className="space-y-4">
          <Textarea
            placeholder="Type your question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
          />
          <Button onClick={handleAsk} disabled={loading || !question.trim()} className="w-full">
            {loading ? "Thinking..." : "Ask"}
          </Button>

          {loading && (
            <p className="text-muted-foreground text-center animate-pulse">Thinking...</p>
          )}

          {error && (
            <p className="text-destructive text-center">
              Something went wrong. Please try again.
            </p>
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

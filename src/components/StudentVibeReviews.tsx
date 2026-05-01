import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Sparkles, ChevronDown, ExternalLink } from "lucide-react";
import { capture } from "@/lib/posthog";

type Ratings = {
  socialLife?: number;
  campusBeauty?: number;
  academicPressure?: number;
  schoolSpirit?: number;
  careerOpportunities?: number;
};

interface StudentVibeReviewsProps {
  collegeName: string;
}

const RATING_LABELS: Array<{ key: keyof Ratings; label: string }> = [
  { key: "socialLife", label: "Social Life" },
  { key: "campusBeauty", label: "Campus Beauty" },
  { key: "academicPressure", label: "Academic Pressure" },
  { key: "schoolSpirit", label: "School Spirit" },
  { key: "careerOpportunities", label: "Career Opportunities" },
];

const RatingBar = ({ value }: { value: number }) => {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
      />
    </div>
  );
};

type SourceLink = { platform: string; label: string; url: string };

const StudentVibeReviews = ({ collegeName }: StudentVibeReviewsProps) => {
  const [summary, setSummary] = useState<string>("");
  const [snippets, setSnippets] = useState<string[]>([]);
  const [ratings, setRatings] = useState<Ratings>({});
  const [sources, setSources] = useState<SourceLink[]>([]);
  const [sourceNote, setSourceNote] = useState<string>("Paraphrased themes from real public student reviews");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("college-vibe-reviews", {
          body: { collegeName },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setSummary(data?.summary || "");
        setSnippets(data?.snippets || []);
        setRatings(data?.ratings || {});
        setSources(Array.isArray(data?.sources) ? data.sources : []);
        setSourceNote(data?.sourceNote || "Paraphrased themes from real public student reviews");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [collegeName]);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) capture("review_expand_click", { college_name: collegeName });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <Heart className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-display text-base sm:text-lg font-bold text-foreground">Student Vibe Reviews</h3>
          <p className="text-[11px] text-muted-foreground italic">{sourceNote}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">Couldn't load reviews right now.</p>
      ) : (
        <>
          {summary && (
            <p className="text-sm text-foreground leading-relaxed mb-4 bg-muted/30 rounded-xl p-3 sm:p-4">
              {summary}
            </p>
          )}

          {/* Ratings */}
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-4">
            {RATING_LABELS.map(({ key, label }) => {
              const v = ratings[key];
              if (typeof v !== "number") return null;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs text-foreground mb-1">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">{v.toFixed(1)} / 5</span>
                  </div>
                  <RatingBar value={v} />
                </div>
              );
            })}
          </div>

          {/* Snippets */}
          {snippets.length > 0 && (
            <div>
              <button
                onClick={toggleExpand}
                className="flex items-center gap-1.5 text-primary text-xs font-semibold mb-2 hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {expanded ? "Hide" : "Show"} student insights
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
              {expanded && (
                <ul className="space-y-2 mt-2">
                  {snippets.map((s, i) => (
                    <li
                      key={i}
                      className="text-sm text-foreground bg-muted/20 rounded-xl px-3 py-2 border-l-2 border-primary/40 italic"
                    >
                      "{s}"
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentVibeReviews;

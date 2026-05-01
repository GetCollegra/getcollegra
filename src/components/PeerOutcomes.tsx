import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Sparkles } from "lucide-react";
import { capture } from "@/lib/posthog";

type Group = { headline: string; colleges: string[]; note: string };

interface PeerOutcomesProps {
  profile: {
    gpa?: string;
    state?: string;
    major?: string;
    testScore?: string;
    campusSize?: string;
    locationType?: string;
    academicImportance?: string;
    idealSchoolType?: string;
    topPriorities?: string[];
    interests?: string[];
  };
  variant?: "full" | "widget";
}

const PeerOutcomes = ({ profile, variant = "full" }: PeerOutcomesProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable cache key from quiz inputs so we re-fetch when answers change
  const cacheKey = JSON.stringify({
    g: profile.gpa, s: profile.state, m: profile.major, t: profile.testScore,
    cs: profile.campusSize, lt: profile.locationType, ai: profile.academicImportance,
    ist: profile.idealSchoolType, tp: profile.topPriorities, i: profile.interests,
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("peer-outcomes", {
          body: { profile },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setGroups(data?.groups || []);
        capture("peer_outcome_view");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const visibleGroups = variant === "widget" ? groups.slice(0, 1) : groups;

  return (
    <section className={variant === "full" ? "py-12 sm:py-16 bg-muted/10" : ""}>
      <div className={variant === "full" ? "container px-4" : ""}>
        {variant === "full" && (
          <div className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" /> Confidence boost
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Students Like You Got Into
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Estimated peer trends based on your profile — not real student records.
            </p>
          </div>
        )}

        {variant === "widget" && (
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">Students Like You Got Into</h3>
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {Array.from({ length: variant === "widget" ? 1 : 3 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-muted-foreground text-sm">Couldn't load examples right now.</p>
        ) : (
          <div className={`grid gap-3 sm:gap-4 ${variant === "widget" ? "" : "sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"}`}>
            {visibleGroups.map((g, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-soft"
              >
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Peer trend
                </p>
                <p className="text-sm font-semibold text-foreground mb-3 leading-snug">{g.headline}</p>
                <ul className="space-y-1.5 mb-3">
                  {g.colleges.map((c, ci) => (
                    <li key={ci} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground italic">{g.note}</p>
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-muted-foreground mt-4 italic">
          Examples are AI-generated based on common admissions patterns.
        </p>
      </div>
    </section>
  );
};

export default PeerOutcomes;

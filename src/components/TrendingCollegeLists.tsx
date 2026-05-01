import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, MapPin, ArrowRight } from "lucide-react";
import { capture } from "@/lib/posthog";

type CollegeItem = { name: string; location: string; tag: string };
type CollegeList = {
  id: string;
  slug: string;
  title: string;
  description: string;
  emoji: string;
  colleges: CollegeItem[];
};

interface TrendingCollegeListsProps {
  variant?: "full" | "widget"; // widget = compact dashboard tile
}

const TrendingCollegeLists = ({ variant = "full" }: TrendingCollegeListsProps) => {
  const [lists, setLists] = useState<CollegeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState<CollegeList | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("college_lists" as any)
        .select("id, slug, title, description, emoji, colleges")
        .order("display_order", { ascending: true });
      if (data) setLists(data as unknown as CollegeList[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleOpen = (list: CollegeList) => {
    setActiveList(list);
    capture("ranking_list_click", { list_slug: list.slug });
  };

  const visibleLists = variant === "widget" ? lists.slice(0, 4) : lists;

  return (
    <section className={variant === "full" ? "py-12 sm:py-16 bg-background" : ""}>
      <div className={variant === "full" ? "container px-4" : ""}>
        {variant === "full" && (
          <div className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <TrendingUp className="w-3.5 h-3.5" /> Browse by interest
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Trending College Lists
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Curated lists to help you explore beyond your matches
            </p>
          </div>
        )}

        {variant === "widget" && (
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">Trending College Lists</h3>
          </div>
        )}

        {loading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-56 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {visibleLists.map((list, i) => (
              <motion.button
                key={list.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleOpen(list)}
                className="group shrink-0 snap-start text-left bg-card hover:bg-accent/5 border border-border hover:border-primary/40 rounded-2xl p-4 sm:p-5 w-56 sm:w-64 transition-all hover:shadow-soft"
              >
                <div className="text-2xl mb-2">{list.emoji}</div>
                <h3 className="font-display font-bold text-foreground text-sm sm:text-base mb-1 leading-snug">
                  {list.title}
                </h3>
                <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{list.description}</p>
                <div className="flex items-center gap-1 text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  See list <ArrowRight className="w-3 h-3" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!activeList} onOpenChange={(open) => !open && setActiveList(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
              <span>{activeList?.emoji}</span> {activeList?.title}
            </DialogTitle>
            <DialogDescription>{activeList?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {activeList?.colleges.map((c, i) => (
              <div
                key={c.name}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {c.location}
                    </span>
                  </div>
                  {c.tag && <p className="text-xs text-muted-foreground mt-1 italic">{c.tag}</p>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default TrendingCollegeLists;

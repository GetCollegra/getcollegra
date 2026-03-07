import { ArrowLeft, Target, Lightbulb, FolderCheck, Clock } from "lucide-react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { trackClick } from "@/lib/analytics";

const valuePages = {
  "personalized-matches": {
    icon: Target,
    title: "Your matches, built for you",
    body: "We look at your grades, interests, location preferences, and goals to recommend colleges that actually fit you.",
    subtext: "No generic rankings. No endless filters.",
    cta: "Start the survey",
    smallLine: "Takes about 2 minutes",
    ctaLink: "/survey",
  },
  "why-each-school": {
    icon: Lightbulb,
    title: 'See the "why," not just the name',
    body: "For every college we recommend, we explain why it fits you — academics, campus vibe, location, and more.",
    subtext: "So you're not guessing anymore.",
    cta: "Start the survey",
    smallLine: "See how it works",
    ctaLink: "/survey",
  },
  "organize-choices": {
    icon: FolderCheck,
    title: "All your colleges. One dashboard.",
    body: "Save, compare, and organize your top schools without juggling tabs, notes, and spreadsheets.",
    subtext: "Everything stays in one place.",
    cta: "Build your list",
    smallLine: "Unlock after the survey",
    ctaLink: "/survey",
  },
  "reduce-stress": {
    icon: Clock,
    title: "College planning, minus the overwhelm",
    body: "Collegra™ simplifies the process so you spend less time researching and more time feeling confident.",
    subtext: "Fewer hours. Better decisions.",
    cta: "Get started",
    smallLine: "Free to try",
    ctaLink: "/survey",
  },
};

const ValueDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? valuePages[slug as keyof typeof valuePages] : null;

  if (!page) return <Navigate to="/" replace />;

  const Icon = page.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6">
        <Link to="/" onClick={() => trackClick("Back to Home", "ValueDetail", { slug: slug ?? "" })}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="container px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <Icon className="w-8 h-8 text-primary" />
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            {page.title}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-4 leading-relaxed">
            {page.body}
          </p>

          <p className="text-base text-foreground/70 font-medium mb-10">
            {page.subtext}
          </p>

          <Link to={page.ctaLink} onClick={() => trackClick(page.cta, "ValueDetail", { slug: slug ?? "" })}>
            <Button variant="hero" size="xl">
              {page.cta}
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground mt-4">{page.smallLine}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ValueDetail;

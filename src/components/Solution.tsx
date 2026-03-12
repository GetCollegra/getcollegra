import { motion } from "framer-motion";
import { Sparkles, LayoutDashboard, Clock3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const pillars = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    desc: "Our system analyzes your goals, interests, and preferences to surface colleges that genuinely fit — not just popular ones.",
    highlight: "Personalized to you",
  },
  {
    icon: LayoutDashboard,
    title: "Everything in One Place",
    desc: "No more bouncing between 6 websites. Compare, organize, and decide — all in Collegra™.",
    highlight: "One dashboard",
  },
  {
    icon: Clock3,
    title: "Save Hours of Research",
    desc: "Get a clear, personalized college list in minutes instead of months of stressful searching.",
    highlight: "Results in minutes",
  },
];

const Solution = () => {
  return (
    <section className="py-20 md:py-28 bg-background border-b border-border relative overflow-hidden">
      {/* Decorative gradient blob */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="container px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            <Sparkles className="w-4 h-4" />
            The Solution
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            A simpler, smarter approach.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Collegra™ cuts through the noise by matching students to colleges that fit
            what matters most to them.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="group bg-card border border-border rounded-2xl p-7 shadow-soft hover:shadow-card transition-all duration-300 relative overflow-hidden"
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary transition-colors duration-300" />

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <pillar.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">{pillar.highlight}</span>
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-2">{pillar.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link to="/survey">
            <Button variant="hero" size="xl" className="gap-2">
              Start My Free Survey
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Solution;

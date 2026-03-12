import { motion } from "framer-motion";
import { AlertCircle, Search, Clock, HelpCircle, Shuffle } from "lucide-react";

const painPoints = [
  {
    icon: Shuffle,
    title: "Generic rankings",
    desc: "Flooded with college lists that don't reflect your goals, interests, or preferences.",
  },
  {
    icon: Search,
    title: "Scattered research",
    desc: "Hours lost bouncing between websites, spreadsheets, and outdated resources.",
  },
  {
    icon: HelpCircle,
    title: "No clear direction",
    desc: "Stressful process with no guidance on where to start or what matters most.",
  },
  {
    icon: Clock,
    title: "Wasted time",
    desc: "Hard to know which colleges are actually a good fit until it's too late.",
  },
];

const Problem = () => {
  return (
    <section className="py-20 md:py-28 bg-secondary/30 border-b border-border relative overflow-hidden">
      {/* Subtle decorative element */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-destructive/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="container px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            <AlertCircle className="w-4 h-4" />
            The Problem
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            The college search is broken.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Students spend months navigating a confusing maze of rankings, websites, and generic advice — 
            with no clear way to find schools that actually fit them.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-5">
          {painPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group bg-card rounded-2xl p-6 shadow-soft border border-border hover:shadow-card transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <point.icon className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-foreground font-semibold text-base mb-1.5">{point.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{point.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Problem;

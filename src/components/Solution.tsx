import { motion } from "framer-motion";
import { Sparkles, LayoutDashboard, Clock3 } from "lucide-react";

const pillars = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    desc: "Our system analyzes your goals, interests, and preferences to surface colleges that genuinely fit.",
  },
  {
    icon: LayoutDashboard,
    title: "Everything in One Place",
    desc: "No more bouncing between 6 websites. Compare, organize, and decide — all in Collegra™.",
  },
  {
    icon: Clock3,
    title: "Save Hours of Research",
    desc: "Get a clear, personalized college list in minutes instead of months.",
  },
];

const Solution = () => {
  return (
    <section className="py-20 md:py-28 bg-background border-b border-border">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">The Solution</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            A simpler, personalized approach.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Collegra™ cuts through the noise by matching students to colleges that fit
            what matters most to them.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-card border border-border rounded-2xl p-7 shadow-soft hover:shadow-card transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <pillar.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{pillar.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solution;


import { motion } from "framer-motion";
import { Target, Lightbulb, FolderCheck, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { trackClick } from "@/lib/analytics";

const values = [
  {
    icon: Target,
    text: "Get personalized college matches",
    desc: "AI-powered recommendations based on your unique profile and preferences.",
    slug: "personalized-matches",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Lightbulb,
    text: "Understand why each school fits",
    desc: "Clear explanations for every recommendation so you're never guessing.",
    slug: "why-each-school",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: FolderCheck,
    text: "Organize your top choices",
    desc: "Save, compare, and manage everything in one powerful dashboard.",
    slug: "organize-choices",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Clock,
    text: "Reduce stress and save time",
    desc: "Go from overwhelmed to confident in minutes, not months.",
    slug: "reduce-stress",
    color: "bg-accent/10 text-accent",
  },
];

const Value = () => {
  return (
    <section className="py-20 md:py-28 bg-background border-b border-border">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">Why Collegra™</p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What Collegra™ helps you do
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to find, compare, and choose the right colleges — without the overwhelm.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-5">
          {values.map((item, index) => (
            <Link to={`/value/${item.slug}`} key={index} onClick={() => trackClick(item.text, "Value")}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group bg-card rounded-2xl p-6 shadow-soft border border-border hover:shadow-card transition-all duration-300 h-full"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                      {item.text}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Value;

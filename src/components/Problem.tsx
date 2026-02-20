import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

const painPoints = [
  "Flooded with generic college rankings that don't apply to you",
  "Hours lost researching schools scattered across multiple websites",
  "Stressful process with no clear direction on where to start",
  "Hard to know which colleges are actually a good fit",
];

const Problem = () => {
  return (
    <section className="py-20 md:py-28 bg-secondary/40 border-b border-border">
      <div className="container px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">The Problem</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              The college search is overwhelming.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Students are flooded with rankings, websites, and advice that are generic
              and confusing. The process feels stressful and time consuming, and it is
              hard to know which colleges are actually a good fit.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-4"
          >
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-3 bg-background rounded-xl p-4 shadow-soft border border-border"
              >
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-foreground font-medium">{point}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Problem;


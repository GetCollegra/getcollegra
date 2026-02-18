import { motion } from "framer-motion";
import { Target, Lightbulb, FolderCheck, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { trackClick } from "@/lib/analytics";

const values = [
  {
    icon: Target,
    text: "Get personalized college matches",
    slug: "personalized-matches",
  },
  {
    icon: Lightbulb,
    text: "Understand why each school fits you",
    slug: "why-each-school",
  },
  {
    icon: FolderCheck,
    text: "Organize your top choices in one place",
    slug: "organize-choices",
  },
  {
    icon: Clock,
    text: "Reduce stress and save time",
    slug: "reduce-stress",
  },
];

const Value = () => {
  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            What Collegra helps you do
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          <div className="grid gap-4">
            {values.map((item, index) => (
              <Link to={`/value/${item.slug}`} key={index} onClick={() => trackClick(item.text, "Value")}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center gap-4 p-5 bg-background rounded-xl shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer hover:translate-x-1"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {item.text}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Value;

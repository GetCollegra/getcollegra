import { motion } from "framer-motion";
import { Target, Lightbulb, FolderCheck, Clock } from "lucide-react";

const values = [
  {
    icon: Target,
    text: "Get personalized college matches",
  },
  {
    icon: Lightbulb,
    text: "Understand why each school fits you",
  },
  {
    icon: FolderCheck,
    text: "Organize your top choices in one place",
  },
  {
    icon: Clock,
    text: "Reduce stress and save time",
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
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center gap-4 p-5 bg-background rounded-xl shadow-soft hover:shadow-card transition-shadow duration-300"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Value;

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AskAI from "@/components/AskAI";
import { trackClick } from "@/lib/analytics";

const bullets = [
  "Campus environment",
  "Academic support",
  "Long-term outcomes",
];

const QuizResults = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-20 md:py-32">
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl mx-auto text-center"
          >
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>

            {/* Heading */}
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Your Collegra AI College Fit
            </h1>

            {/* Body */}
            <p className="text-muted-foreground text-lg mb-8">
              Based on your quiz responses, Collegra's AI analyzed what matters most to you in a college experience.
            </p>

            {/* Bullets */}
            <div className="flex flex-col gap-3 items-center mb-10">
              {bullets.map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.15 }}
                  className="flex items-center gap-3 text-foreground text-base"
                >
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  {item}
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <Link to="/coming-soon" onClick={() => trackClick("Unlock Full Results", "QuizResults")}>
              <Button size="xl" variant="hero" className="rounded-full px-10">
                Unlock Full Results →
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      <AskAI />

      <Footer />
    </div>
  );
};

export default QuizResults;

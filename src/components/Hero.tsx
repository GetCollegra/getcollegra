import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackClick } from "@/lib/analytics";
import { CheckCircle2 } from "lucide-react";

const features = [
  "Personalized College Matching",
  "Organize Your Colleges",
  "AI Finds the Best Colleges for You",
];

const stats = [
  { value: "100+", label: "Colleges Matched" },
  { value: "Free", label: "To Get Started" },
  { value: "5 min", label: "Quick Survey" },
];

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-background overflow-hidden">
      {/* Subtle light blue background blob */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-primary/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/60 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4 py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              AI-Powered College Matching
            </motion.div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] mb-6">
              Find the college that{" "}
              <span className="text-primary">actually fits you.</span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg"
            >
              Collegra gives you personalized college matches based on your goals,
              interests, and preferences — so you can stop guessing and start with clarity.
            </motion.p>

            {/* Feature checkmarks */}
            <motion.ul
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="space-y-3 mb-10"
            >
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-foreground font-medium">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/survey" onClick={() => trackClick("Unlock Full Matches", "Hero")}>
                <Button size="lg" className="text-base px-8 py-6 rounded-lg font-semibold shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                  Get My College Matches
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-lg font-medium">
                  See How It Works
                </Button>
              </a>
            </motion.div>
          </motion.div>

          {/* Right: Stats card panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="hidden lg:flex flex-col gap-6"
          >
            {/* Main hero card */}
            <div className="bg-gradient-hero rounded-2xl p-8 shadow-elevated text-white">
              <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-3">Your Match Score</p>
              <div className="flex items-end gap-3 mb-6">
                <span className="text-7xl font-bold leading-none">94</span>
                <span className="text-3xl font-semibold text-white/70 pb-2">/ 100</span>
              </div>
              <p className="text-white/80 font-medium mb-4">University of Michigan — Ann Arbor</p>
              <div className="space-y-3">
                {["Major Alignment", "Campus Culture", "Financial Fit", "Location"].map((label, i) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">{label}</span>
                      <span className="text-white font-medium">{[96, 91, 88, 94][i]}%</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${[96, 91, 88, 94][i]}%` }}
                        transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                        className="h-full bg-white rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center shadow-soft">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
};

export default Hero;


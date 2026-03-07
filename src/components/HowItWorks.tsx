import { motion } from "framer-motion";
import { ClipboardList, Star, GitCompare, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import stepSurvey from "@/assets/step-survey.jpg";
import stepMatches from "@/assets/step-matches-example.jpg";
import stepCompare from "@/assets/step-compare.jpg";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Take the Quiz",
    subtitle: "5 minutes. Zero stress.",
    description:
      "Answer a short set of questions about your major interests, preferred campus size, location, budget, and the vibe you're looking for. No right or wrong answers — just you being you.",
    bullets: ["Academic goals & major preferences", "Campus culture & lifestyle", "Location & financial fit"],
    image: stepSurvey,
    imageAlt: "Student taking the Collegra™ quiz on a laptop",
    flip: false,
  },
  {
    number: "02",
    icon: Star,
    title: "Get Your Personalized Matches — Example",
    subtitle: "Results tailored to you.",
    description:
      "Our AI instantly analyzes your responses against hundreds of colleges to surface the ones that fit you best — ranked by match score across academics, culture, and finances.",
    bullets: ["Match scores for each college", "Ranked by best overall fit", "Delivered instantly to your inbox"],
    image: stepMatches,
    imageAlt: "Student reviewing personalized college match results",
    flip: true,
  },
  {
    number: "03",
    icon: GitCompare,
    title: "Compare & Choose with Confidence",
    subtitle: "Side-by-side clarity.",
    description:
      "Review your matches side by side. Compare acceptance rates, tuition costs, campus culture ratings, and more — all in one clean dashboard so you can make an informed decision.",
    bullets: ["Side-by-side college comparison", "Acceptance rates & tuition data", "Culture & fit breakdown"],
    image: stepCompare,
    imageAlt: "Student comparing college options on a laptop",
    flip: false,
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-secondary/40 border-b border-border">
      <div className="container px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-widest mb-3">
            Simple Process
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            How it works
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            From quiz to college list — three straightforward steps designed to save you time and stress.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto space-y-24">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className={`flex flex-col ${step.flip ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 lg:gap-16 items-center`}
            >
              {/* Image */}
              <div className="w-full lg:w-1/2 flex-shrink-0">
                <div className="relative rounded-2xl overflow-hidden shadow-elevated">
                  <img
                    src={step.image}
                    alt={step.imageAlt}
                    className="w-full h-72 lg:h-80 object-cover"
                  />
                  {/* Blue overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
                  {/* Step badge */}
                  <div className="absolute top-5 left-5 bg-gradient-hero text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-md tracking-wide uppercase">
                    Step {step.number}
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="w-full lg:w-1/2">
                {/* Icon + number */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-primary font-bold text-sm uppercase tracking-widest">{step.subtitle}</span>
                </div>

                <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {step.description}
                </p>

                {/* Bullets */}
                <ul className="space-y-2">
                  {step.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2.5 text-foreground text-sm font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-20"
        >
          <Link to="/survey">
            <Button size="lg" className="text-base px-8 py-6 rounded-lg font-semibold shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all gap-2">
              Start My Quiz <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-3">Free to start · Takes 5 minutes</p>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

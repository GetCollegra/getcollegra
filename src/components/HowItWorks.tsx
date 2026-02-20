import { motion } from "framer-motion";
import { ClipboardList, Search, Mail } from "lucide-react";
import stepSurvey from "@/assets/step-survey.jpg";
import stepAnalysis from "@/assets/step-analysis.jpg";
import stepMatches from "@/assets/step-matches.jpg";

const steps = [
  {
    icon: ClipboardList,
    number: "01",
    title: "Answer a Short Survey",
    description:
      "Tell us about your academic goals, interests, budget, and preferences. It only takes 5 minutes.",
    image: stepSurvey,
    imageAlt: "Student filling out a survey on a laptop",
  },
  {
    icon: Search,
    number: "02",
    title: "AI Analyzes Your Profile",
    description:
      "Our AI reviews hundreds of colleges against your unique profile to find the best fits for you.",
    image: stepAnalysis,
    imageAlt: "AI data analysis dashboard",
  },
  {
    icon: Mail,
    number: "03",
    title: "Get Your College Matches",
    description:
      "Receive a personalized list of colleges ranked by how well they match your goals and preferences.",
    image: stepMatches,
    imageAlt: "Student smiling at college match results",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-secondary/40 border-b border-border">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-widest mb-3">
            Simple Process
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            How it works
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Three simple steps to find colleges that truly fit who you are.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: index * 0.15 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Photo */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={step.image}
                  alt={step.imageAlt}
                  className="w-full h-full object-cover"
                />
                {/* Blue tint overlay */}
                <div className="absolute inset-0 bg-primary/20" />
                {/* Step number badge */}
                <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center shadow-md">
                  <span className="text-primary-foreground font-bold text-sm">{step.number}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-1">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Connector line (desktop) */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          This is an early test version of Collegra.
        </motion.p>
      </div>
    </section>
  );
};

export default HowItWorks;

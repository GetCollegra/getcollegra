import { motion } from "framer-motion";
import { Sparkles, LayoutDashboard, Target, ShieldCheck, Clock, BookOpen } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    description: "Our AI analyzes hundreds of colleges to surface the ones that truly align with your unique goals and personality.",
  },
  {
    icon: Target,
    title: "Personalized to You",
    description: "Matches are built around your major interests, campus vibe, location preferences, and financial situation.",
  },
  {
    icon: LayoutDashboard,
    title: "Side-by-Side Comparison",
    description: "Easily compare your top matches across acceptance rates, tuition, culture fit, and more — all in one place.",
  },
  {
    icon: Clock,
    title: "Results in Minutes",
    description: "Skip weeks of research. Take a 5-minute quiz and get a curated shortlist of colleges instantly.",
  },
  {
    icon: BookOpen,
    title: "100+ Colleges Covered",
    description: "From large public universities to small liberal arts colleges, our database spans all types of institutions.",
  },
  {
    icon: ShieldCheck,
    title: "Free to Get Started",
    description: "No cost, no commitment. Start your search today and only upgrade if you want deeper insights.",
  },
];

const ExplainerVideo = () => {
  return (
    <section className="py-20 md:py-28 bg-card border-b border-border">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-widest mb-3">
            Why Collegra
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Everything you need to find the right fit
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Collegra takes the guesswork out of college searching with smart tools designed around you.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="bg-background border border-border rounded-2xl p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-base mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExplainerVideo;

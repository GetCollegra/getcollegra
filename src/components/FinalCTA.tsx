import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackClick } from "@/lib/analytics";


const FinalCTA = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-hero relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-20 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-10 right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <p className="text-white/60 text-sm uppercase tracking-widest font-semibold mb-4">Get Started Free</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Stop guessing. Start with colleges that fit you.
          </h2>
          <p className="text-white/75 text-lg mb-10">Join students already finding their perfect college match.</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/survey" onClick={() => trackClick("Unlock Full Matches", "FinalCTA")}>
              <Button
                size="xl"
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-elevated hover:-translate-y-0.5 transition-all rounded-full px-10"
              >
                Get My College Matches →
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="xl"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 bg-transparent rounded-full px-10"
              >
                See How It Works
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;


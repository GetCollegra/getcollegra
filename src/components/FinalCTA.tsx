import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { trackClick } from "@/lib/analytics";


const FinalCTA = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-hero relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
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
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Stop guessing. Start with colleges that fit you.
          </h2>
          <p className="text-white/75 text-lg mb-8">Join students already finding their perfect college match.</p>
          
          <Link to="/survey" onClick={() => trackClick("Unlock Full Matches", "FinalCTA")}>
            <Button 
              size="xl" 
              className="bg-white text-primary hover:bg-white/90 font-semibold shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              Get My College Matches
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;

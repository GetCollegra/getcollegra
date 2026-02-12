import { motion } from "framer-motion";
import { Play } from "lucide-react";

const ExplainerVideo = () => {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            See How Collegra Works
          </h2>
          <p className="text-muted-foreground mb-8">
            Watch our quick explainer to see how we match you with the right colleges.
          </p>

          {/* Video placeholder – replace the src below with your actual video embed */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted shadow-elevated">
            {/* Replace this div with an <iframe> or <video> when you have the real video */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="w-8 h-8 text-primary ml-1" />
              </div>
              <span className="text-muted-foreground text-sm">
                Your whiteboard explainer video goes here
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ExplainerVideo;

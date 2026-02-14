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
            <video
              className="w-full h-full object-cover"
              controls
              playsInline
              preload="metadata"
            >
              <source src="/videos/explainer.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ExplainerVideo;

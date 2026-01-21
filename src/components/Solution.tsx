import { motion } from "framer-motion";

const Solution = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-subtle">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            A simpler, personalized approach.
          </h2>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Collegra cuts through the noise by matching students to colleges that fit 
            what matters most to them. Everything is organized into one clear experience 
            so students can make confident decisions.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Solution;

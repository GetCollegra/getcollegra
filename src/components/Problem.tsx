import { motion } from "framer-motion";

const Problem = () => {
  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            The college search is overwhelming.
          </h2>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            Students are flooded with rankings, websites, and advice that are generic 
            and confusing. The process feels stressful and time consuming, and it is 
            hard to know which colleges are actually a good fit.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Problem;

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const Pricing = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-subtle">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Choose how you want access
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Monthly Access */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow duration-300 border-2 border-accent"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-accent text-accent-foreground text-sm font-semibold px-4 py-1 rounded-full">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Monthly Access
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">$9.99</span>
                <span className="text-muted-foreground">per month</span>
              </div>
              <p className="text-primary font-medium mt-2">14-day free trial</p>
            </div>

            <p className="text-muted-foreground mb-8">
              Try free for 14 days, then $9.99/month. Cancel anytime.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Personalized college list that updates as your GPA, interests, or goals change</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Ongoing guidance through deadlines, applications, and decisions</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Clear next steps so you always know what to do next</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>One platform that grows with you throughout the year</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Cancel anytime</span>
              </li>
            </ul>

            <Link to="/survey" className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                Unlock Full Matches (Monthly)
              </Button>
            </Link>
          </motion.div>

          {/* One-Time Access */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow duration-300"
          >

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                One-Time Access
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">$59</span>
                <span className="text-muted-foreground">one-time</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-8">
              Pay once and receive your personalized college matches.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>One complete, personalized college roadmap</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Clear safety, target, and reach school recommendations</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Action checklist you can use immediately</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Pay once, no subscription required</span>
              </li>
            </ul>

            <Link to="/survey" className="w-full">
              <Button variant="hero" size="lg" className="w-full">
                Get Full Matches (One-Time)
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;

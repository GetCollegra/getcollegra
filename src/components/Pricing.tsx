import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { trackClick } from "@/lib/analytics";
import { useNavigate } from "react-router-dom";


const Pricing = () => {
  const navigate = useNavigate();

  const handlePricingClick = (label: string, section: string) => {
    trackClick(label, section);
    navigate("/coming-soon");
  };

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
              <p className="text-muted-foreground text-sm mt-1">Less than one hour with a private counselor</p>
            </div>

            <p className="text-muted-foreground mb-8">
              Try free for 14 days, then $9.99/month. Cancel anytime.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Clear next steps so you always know what to do — less stress, more clarity</span>
              </li>
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
                <span>One platform that keeps everything organized throughout the year</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Cancel anytime</span>
              </li>
            </ul>

            <Button variant="outline" size="lg" className="w-full" onClick={() => handlePricingClick("Unlock Full Matches (Monthly)", "Pricing")}>
              Unlock Full Matches (Monthly)
            </Button>
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
                <span className="text-4xl font-bold text-foreground">$59.99</span>
                <span className="text-muted-foreground">one-time</span>
              </div>
              <p className="text-primary font-medium mt-2">No recurring fees</p>
              <p className="text-muted-foreground text-sm mt-1">Unlike competitors that charge every month</p>
            </div>

            <p className="text-muted-foreground mb-6">
              Pay once and get everything you need to make a confident college decision.
            </p>

            {/* Core Features */}
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Core Features</h4>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Personalized college matches based on major, location, campus vibe, budget & financial fit</span>
              </li>
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Side-by-side college comparisons — not scattered across websites</span>
              </li>
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Location-based insights: distance to grocery stores, hospitals, transportation</span>
              </li>
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Simple pros & cons summaries written in student-friendly language</span>
              </li>
            </ul>

            {/* Decision-Making Tools */}
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Decision-Making Tools</h4>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Final Decision Dashboard — rank schools, compare cost vs outcomes</span>
              </li>
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Visual "best-fit" score for each college</span>
              </li>
            </ul>

            {/* Stress Reduction */}
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Stress Reduction</h4>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Everything in one place instead of 5–6 platforms</span>
              </li>
            </ul>

            <Button variant="hero" size="lg" className="w-full" onClick={() => handlePricingClick("Get Full Matches (One-Time)", "Pricing")}>
              Get Full Matches (One-Time)
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;

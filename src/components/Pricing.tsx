import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { trackClick } from "@/lib/analytics";
import { capture } from "@/lib/posthog";
import { startCheckout } from "@/lib/checkout";
import { useToast } from "@/hooks/use-toast";


const Pricing = () => {
  const { toast } = useToast();

  const handlePricingClick = (label: string, section: string) => {
    trackClick(label, section);
    capture("premium_clicked", { source: "pricing" });
    startCheckout(toast);
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-background border-b border-border">
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

        <div className="max-w-lg mx-auto">
          {/* Monthly Access */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow duration-300 border-2 border-accent"
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Premium Access
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">$9.99</span>
                <span className="text-muted-foreground">per month</span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">Less than one hour with a private counselor</p>
            </div>

            <p className="text-muted-foreground mb-8">
              Cancel anytime. Everything you need to find, compare, and choose the right college.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                "Full AI-personalized college match list",
                "Detailed fit scores for every school",
                "Side-by-side comparison tool",
                "Interactive campus map & neighborhood insights",
                "College organizer with notes, tags & checklists",
                "Cost, ROI & graduation outcome breakdowns",
                "Admitted student profiles & how you compare",
                "Travel estimates from your home to each campus",
                "Smart insights tailored to your goals",
                "Downloadable personalized college report",
                "Unlimited quiz retakes as your goals evolve",
                "Priority access to new features",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-foreground">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button variant="hero" size="lg" className="w-full" onClick={() => handlePricingClick("Unlock Full Matches", "Pricing")}>
              Unlock Full Matches
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;

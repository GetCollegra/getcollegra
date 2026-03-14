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
              <p className="text-muted-foreground text-sm mt-1">Less than one hour with a private counselor</p>
            </div>

            <p className="text-muted-foreground mb-8">
              Cancel anytime. Get full access to all features.
            </p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Full AI college match results</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Personalized college fit scores</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Save & organize colleges</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Compare schools side-by-side</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Smart insights for better decisions</span>
              </li>
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

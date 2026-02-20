import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="container px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center pt-10"
        >
          <div className="text-6xl mb-8">🚧</div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Sorry, you caught us before we're ready!
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-4 leading-relaxed">
            We're still putting the finishing touches on Collegra. We want to make sure everything is perfect before you dive in.
          </p>

          <p className="text-base text-foreground/70 font-medium mb-10">
            Be the first to know when we launch — take our quick survey and we'll reach out as soon as we're live.
          </p>

          <Link to="/survey">
            <Button variant="hero" size="xl">
              Join the waitlist
            </Button>
          </Link>

          <p className="text-sm text-muted-foreground mt-4">Takes about 2 minutes</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ComingSoon;

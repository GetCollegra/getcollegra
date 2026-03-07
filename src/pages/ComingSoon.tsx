import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255);

const ComingSoon = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError("");
    setLoading(true);
    const { error: dbError } = await supabase
      .from("waitlist_emails")
      .insert({ email: result.data });
    setLoading(false);
    if (dbError) {
      if (dbError.code === "23505") {
        setError("You're already on the list!");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }
    setSubmitted(true);
  };

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
            We're still putting the finishing touches on Collegra™. We want to make sure everything is perfect before you dive in.
          </p>

          <p className="text-base text-foreground/70 font-medium mb-10">
            Drop your email and we'll reach out as soon as we're live.
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-3"
              >
                <CheckCircle className="w-12 h-12 text-primary" />
                <p className="text-lg font-semibold text-foreground">You're on the list!</p>
                <p className="text-muted-foreground text-sm">We'll email you the moment Collegra™ is ready.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@email.com"
                    maxLength={255}
                    className="w-full h-12 px-4 rounded-lg border-2 border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors duration-200"
                  />
                  {error && (
                    <p className="text-destructive text-sm mt-1 text-left">{error}</p>
                  )}
                </div>
                <Button type="submit" variant="hero" size="lg" className="gap-2 shrink-0" disabled={loading}>
                  <Send className="w-4 h-4" />
                  {loading ? "Saving..." : "Notify me"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-sm text-muted-foreground mt-4">No spam, ever.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ComingSoon;

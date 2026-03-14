import { useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ExplainerVideo from "@/components/ExplainerVideo";
import Problem from "@/components/Problem";
import Solution from "@/components/Solution";
import Value from "@/components/Value";
import PremiumPreview from "@/components/PremiumPreview";
import Pricing from "@/components/Pricing";
import HowItWorks from "@/components/HowItWorks";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import { capture } from "@/lib/posthog";

const Index = () => {
  useEffect(() => { capture("homepage_viewed"); }, []);
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <Hero />
        
        {/* Instant CTA Banner */}
        <section className="bg-accent py-10 md:py-14">
          <div className="container px-4 text-center">
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-accent-foreground mb-4">
              Get Your Colleges Instantly
            </h2>
            <p className="text-accent-foreground/80 text-lg mb-6 max-w-xl mx-auto">
              Take a 5-minute survey and get AI-powered college matches — no waiting, no guesswork.
            </p>
            <a href="/survey">
              <button className="bg-primary text-primary-foreground font-semibold text-lg px-10 py-4 rounded-full shadow-elevated hover:bg-primary/90 hover:-translate-y-0.5 transition-all">
                Start Now →
              </button>
            </a>
          </div>
        </section>

        <HowItWorks />
        <PremiumPreview />
        <ExplainerVideo />
        <Value />
        <Problem />
        <Solution />
        
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

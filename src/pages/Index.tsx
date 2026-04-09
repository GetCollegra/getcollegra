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
        <HowItWorks />
        <ExplainerVideo />
        <PremiumPreview />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

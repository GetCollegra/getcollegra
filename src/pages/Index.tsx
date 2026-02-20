import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ExplainerVideo from "@/components/ExplainerVideo";
import Problem from "@/components/Problem";
import Solution from "@/components/Solution";
import Value from "@/components/Value";
import Pricing from "@/components/Pricing";
import HowItWorks from "@/components/HowItWorks";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <Hero />
        <HowItWorks />
        <ExplainerVideo />
        <Problem />
        <Solution />
        <Value />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container px-4 max-w-2xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Terms &amp; Conditions
          </h1>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              By using the Collegra™ website, you agree to use the platform for informational and educational purposes only.
            </p>
            <p>
              Collegra™ provides college matching suggestions based on user responses. While we strive to provide helpful and accurate recommendations, Collegra™ does not guarantee admissions results, financial aid outcomes, or acceptance to any college or university.
            </p>
            <p>
              Users should verify all information directly with colleges before making decisions.
            </p>
            <p>
              Users under the age of 18 should use Collegra™ with the involvement or permission of a parent or guardian.
            </p>
            <p>
              Collegra™ may update or modify these terms at any time. Continued use of the website indicates acceptance of any updates.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;

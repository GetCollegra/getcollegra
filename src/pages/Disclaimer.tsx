import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Disclaimer = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container px-4 max-w-2xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Disclaimer
          </h1>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              Collegra™ provides college recommendations based on user input and algorithmic analysis. These results are suggestions intended to assist with research and planning.
            </p>
            <p>
              Collegra™ does not guarantee admission, scholarships, or outcomes at any institution. Users should independently confirm information with colleges and official sources before making decisions.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Disclaimer;

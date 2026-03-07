import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container px-4 max-w-2xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
            Privacy Policy
          </h1>
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Collegra™ respects your privacy. This Privacy Policy explains how we collect and use information when you use our website.
            </p>

            <h2 className="text-xl font-semibold text-foreground">Information We Collect</h2>
            <p>
              When you use Collegra™, we may collect information such as quiz responses, preferences related to college interests, and basic contact information if you choose to provide it.
            </p>

            <h2 className="text-xl font-semibold text-foreground">How We Use Information</h2>
            <p>
              We use this information to generate personalized college recommendations, improve the platform, and better understand user needs.
            </p>

            <h2 className="text-xl font-semibold text-foreground">Data Sharing</h2>
            <p>
              Collegra™ does not sell personal information to third parties. Information may be used with trusted services that help operate the website, such as hosting, analytics, or payment processing.
            </p>

            <h2 className="text-xl font-semibold text-foreground">Data Security</h2>
            <p>
              We take reasonable steps to protect user information, but no online service can guarantee complete security.
            </p>

            <h2 className="text-xl font-semibold text-foreground">Users Under 18</h2>
            <p>
              Users under 18 should use the platform with permission or supervision from a parent or guardian.
            </p>

            <h2 className="text-xl font-semibold text-foreground">Changes to This Policy</h2>
            <p>
              Collegra™ may update this Privacy Policy as the platform evolves. Continued use of the site means you accept any updates.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;

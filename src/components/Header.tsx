import logoIcon from "@/assets/logo-icon.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden shadow-soft">
              <img src={logoIcon} alt="Collegra logo" className="w-8 h-8 object-contain brightness-0 invert" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Collegra
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
            <a href="/survey" className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-accent transition-colors shadow-soft">
              Get Started →
            </a>
          </nav>
          {/* Mobile CTA */}
          <a href="/survey" className="md:hidden text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-accent transition-colors">
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;


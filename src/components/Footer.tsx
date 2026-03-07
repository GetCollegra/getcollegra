import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-6 bg-card border-t border-border">
      <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          © 2026 Collegra™. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Terms &amp; Conditions
          </Link>
          <Link to="/disclaimer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

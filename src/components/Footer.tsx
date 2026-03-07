import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-6 bg-card border-t border-border">
      <div className="container px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          © 2026 Collegra™. All rights reserved.
        </p>
        <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Terms &amp; Conditions
        </Link>
      </div>
    </footer>
  );
};

export default Footer;

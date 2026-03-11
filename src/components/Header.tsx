import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/use-admin";
import { Shield, LogIn, LogOut, User } from "lucide-react";

const Header = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            {/* Building + Book SVG logo */}
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              {/* Book base */}
              <path d="M15 72 Q50 65 85 72 Q50 79 15 72Z" fill="currentColor" opacity="0.3"/>
              <path d="M15 72 L50 67 L85 72" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
              <path d="M50 67 L50 78" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <path d="M15 72 Q15 79 18 81 Q50 74 82 81 Q85 79 85 72" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
              {/* Columns */}
              <rect x="27" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="39" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="51" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="63" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              {/* Entablature */}
              <rect x="22" y="37" width="56" height="6" rx="2" fill="currentColor"/>
              {/* Pediment */}
              <path d="M22 37 L50 18 L78 37" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" fill="none"/>
              {/* Circle ornament */}
              <circle cx="50" cy="26" r="4" fill="currentColor"/>
            </svg>
            <span className="text-xl font-bold text-foreground tracking-tight">
              Collegra™
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            <a href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</a>
            <a href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
            
            {isAdmin && (
              <a href="/dashboard" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <Shield className="h-4 w-4" /> Dashboard
              </a>
            )}

            {user ? (
              <a href="/dashboard" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <User className="h-4 w-4" /> Dashboard
              </a>
            ) : (
              <a href="/login" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                <LogIn className="h-4 w-4" /> Sign In
              </a>
            )}

            <a href="/survey" className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-accent transition-colors shadow-soft">
              Get Started →
            </a>
          </nav>
          <div className="md:hidden flex items-center gap-3">
            {isAdmin && (
              <a href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                <Shield className="h-5 w-5" />
              </a>
            )}
            {user ? (
              <button onClick={() => { import("@/integrations/supabase/client").then(m => m.supabase.auth.signOut()); }} className="text-muted-foreground hover:text-primary transition-colors">
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <a href="/login" className="text-muted-foreground hover:text-primary transition-colors">
                <LogIn className="h-5 w-5" />
              </a>
            )}
            <a href="/survey" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-accent transition-colors">
              Get Started
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

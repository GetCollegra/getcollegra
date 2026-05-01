import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LayoutDashboard, User, Menu, Home, Tag, Sparkles, Award } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const Header = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Reusable mobile link styles (44px tap target)
  const mobileLinkClass =
    "flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-base font-medium text-foreground hover:bg-muted active:bg-muted/70 transition-colors";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2 min-w-0">
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary shrink-0">
              <path d="M15 72 Q50 65 85 72 Q50 79 15 72Z" fill="currentColor" opacity="0.3"/>
              <path d="M15 72 L50 67 L85 72" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none"/>
              <path d="M50 67 L50 78" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              <path d="M15 72 Q15 79 18 81 Q50 74 82 81 Q85 79 85 72" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
              <rect x="27" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="39" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="51" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="63" y="42" width="7" height="26" rx="1.5" fill="currentColor"/>
              <rect x="22" y="37" width="56" height="6" rx="2" fill="currentColor"/>
              <path d="M22 37 L50 18 L78 37" stroke="currentColor" strokeWidth="4.5" strokeLinejoin="round" fill="none"/>
              <circle cx="50" cy="26" r="4" fill="currentColor"/>
            </svg>
            <span className="text-xl font-bold text-foreground tracking-tight truncate">
              Collegra™
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Home</a>
            <a href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>

            {user ? (
              <>
                <a href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </a>
                <a href="/scholarship-hub" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <Award className="h-4 w-4" /> Scholarships
                </a>
                <a href="/profile" className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <User className="h-4 w-4" /> Profile
                </a>
              </>
            ) : (
              <>
                <a href="/signup" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <User className="h-4 w-4" /> Sign Up
                </a>
                <a href="/login" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                  <LogIn className="h-4 w-4" /> Sign In
                </a>
              </>
            )}

            <a href="/survey" className="text-sm font-semibold bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-accent transition-colors shadow-soft">
              Get Started →
            </a>
          </nav>

          {/* Mobile: primary CTA + hamburger menu */}
          <div className="md:hidden flex items-center gap-2">
            <a
              href="/survey"
              className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2.5 min-h-[40px] rounded-full hover:bg-accent transition-colors flex items-center"
            >
              Get Started
            </a>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                aria-label="Open menu"
                className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-foreground hover:bg-muted active:bg-muted/70 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] max-w-sm p-0 flex flex-col">
                <div className="px-6 py-5 border-b border-border">
                  <span className="text-lg font-bold text-foreground tracking-tight">Collegra™</span>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
                  <SheetClose asChild>
                    <a href="/" className={mobileLinkClass}>
                      <Home className="h-5 w-5 text-muted-foreground" /> Home
                    </a>
                  </SheetClose>
                  <SheetClose asChild>
                    <a href="/#pricing" className={mobileLinkClass}>
                      <Tag className="h-5 w-5 text-muted-foreground" /> Pricing
                    </a>
                  </SheetClose>

                  {user ? (
                    <>
                      <SheetClose asChild>
                        <a href="/dashboard" className={mobileLinkClass}>
                          <LayoutDashboard className="h-5 w-5 text-muted-foreground" /> Dashboard
                        </a>
                      </SheetClose>
                      <SheetClose asChild>
                        <a href="/scholarship-hub" className={mobileLinkClass}>
                          <Award className="h-5 w-5 text-muted-foreground" /> Scholarships
                        </a>
                      </SheetClose>
                      <SheetClose asChild>
                        <a href="/profile" className={mobileLinkClass}>
                          <User className="h-5 w-5 text-muted-foreground" /> Profile
                        </a>
                      </SheetClose>
                    </>
                  ) : (
                    <>
                      <SheetClose asChild>
                        <a href="/signup" className={mobileLinkClass}>
                          <User className="h-5 w-5 text-muted-foreground" /> Sign Up
                        </a>
                      </SheetClose>
                      <SheetClose asChild>
                        <a href="/login" className={mobileLinkClass}>
                          <LogIn className="h-5 w-5 text-muted-foreground" /> Sign In
                        </a>
                      </SheetClose>
                    </>
                  )}
                </nav>
                <div className="p-4 border-t border-border">
                  <SheetClose asChild>
                    <a
                      href="/survey"
                      className="flex items-center justify-center gap-2 w-full px-5 py-3 min-h-[48px] rounded-full bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors shadow-soft"
                    >
                      <Sparkles className="h-4 w-4" /> Take the Quiz
                    </a>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

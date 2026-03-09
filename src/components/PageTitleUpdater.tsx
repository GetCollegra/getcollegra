import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/survey": "College Quiz",
  "/quiz-results": "Quiz Results",
  "/coming-soon": "Coming Soon",
  "/login": "Login",
  "/signup": "Sign Up",
  "/dashboard": "Dashboard",
  "/college-map": "College Map",
  "/terms": "Terms of Service",
  "/disclaimer": "Disclaimer",
  "/privacy": "Privacy Policy",
};

const PageTitleUpdater = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const base = "Collegra";
    const pageTitle = pageTitles[pathname];
    
    if (pathname.startsWith("/value/")) {
      document.title = `${base} – College Value`;
    } else {
      document.title = pageTitle ? `${base} – ${pageTitle}` : base;
    }
  }, [pathname]);

  return null;
};

export default PageTitleUpdater;

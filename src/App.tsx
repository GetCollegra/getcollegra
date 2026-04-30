import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import PageTitleUpdater from "@/components/PageTitleUpdater";
import Index from "./pages/Index";
import Survey from "./pages/Survey";
import QuizResults from "./pages/QuizResults";
import ValueDetail from "./pages/ValueDetail";
import ComingSoon from "./pages/ComingSoon";
import Terms from "./pages/Terms";
import Disclaimer from "./pages/Disclaimer";
import Privacy from "./pages/Privacy";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CollegeMapPage from "./pages/CollegeMapPage";
import CollegeDetailPage from "./pages/CollegeDetailPage";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <PageTitleUpdater />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/survey" element={<Survey />} />
              <Route path="/quiz-results" element={<QuizResults />} />
              <Route path="/value/:slug" element={<ValueDetail />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/college-map" element={<CollegeMapPage />} />
              <Route path="/college" element={<CollegeDetailPage />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

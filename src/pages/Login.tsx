import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { capture } from "@/lib/posthog";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/dashboard";
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Check rate limit before attempting login
    try {
      const { data: rateCheck } = await supabase.functions.invoke("auth-rate-check", {
        body: { action: "login" },
      });
      if (rateCheck && !rateCheck.allowed) {
        toast({ title: "Too many attempts", description: rateCheck.error || "Please wait before trying again.", variant: "destructive" });
        setLoading(false);
        return;
      }
    } catch {
      // Fail open — don't block login if rate limiter is down
    }

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      capture("login_completed");
      // Check if user has completed the survey; if not, send to quiz
      const userId = authData.user?.id;
      if (userId) {
        const { data: surveyData } = await supabase
          .from("survey_submissions")
          .select("id")
          .limit(1);
        const { data: quizData } = await supabase
          .from("quiz_answers")
          .select("id")
          .eq("user_id", userId)
          .limit(1);
        if ((!surveyData || surveyData.length === 0) && (!quizData || quizData.length === 0)) {
          navigate("/survey");
          return;
        }
      }
      navigate(from);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center pt-32 pb-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your Collegra Premium dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 bg-card rounded-2xl p-8 shadow-card border border-border">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline">Create an account</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

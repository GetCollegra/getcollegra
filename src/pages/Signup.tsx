import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import { capture } from "@/lib/posthog";

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-confirmation", {
        body: { email },
      });
      if (error) {
        // Edge function returns 429 with a JSON message on rate limit.
        const ctx = (error as any)?.context;
        let body: any = null;
        try { body = ctx ? await ctx.json?.() : null; } catch { /* ignore */ }
        const msg = body?.message || error.message || "Could not resend right now.";
        if (body?.retryAfterSeconds) setResendCooldown(body.retryAfterSeconds);
        toast({ title: "Please wait", description: msg, variant: "destructive" });
      } else {
        capture("verification_email_resent");
        toast({ title: "Email sent", description: data?.message ?? "Check your inbox shortly." });
        setResendCooldown(data?.cooldownSeconds ?? 60);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Try again in a moment.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    capture("signup_started");
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Check rate limit before attempting signup
    try {
      const { data: rateCheck } = await supabase.functions.invoke("auth-rate-check", {
        body: { action: "signup" },
      });
      if (rateCheck && !rateCheck.allowed) {
        toast({ title: "Too many attempts", description: rateCheck.error || "Please wait before trying again.", variant: "destructive" });
        setLoading(false);
        return;
      }
    } catch {
      // Fail open
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName },
        emailRedirectTo: window.location.origin + "/survey",
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      capture("signup_completed", { email });
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32 pb-16 px-4">
          <div className="w-full max-w-md text-center bg-card rounded-2xl p-10 shadow-card border border-border">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
            <Link to="/login">
              <Button variant="outline">Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center pt-32 pb-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Account</h1>
            <p className="text-muted-foreground">Start your Collegra Premium experience</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5 bg-card rounded-2xl p-8 shadow-card border border-border">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="firstName" placeholder="Your first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" required />
              </div>
            </div>

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
                <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;

import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center pt-32 pb-16 px-4">
        <div className="w-full max-w-md">
          {sent ? (
            <div className="text-center bg-card rounded-2xl p-10 shadow-card border border-border">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h1>
                <p className="text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-2xl p-8 shadow-card border border-border">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

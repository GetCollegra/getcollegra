import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowRight } from "lucide-react";
import Header from "@/components/Header";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center pt-32 pb-16 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Set New Password</h1>
            <p className="text-muted-foreground">Choose a strong password for your account.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-2xl p-8 shadow-card border border-border">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="confirm" type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading || !ready}>
              {loading ? "Updating..." : "Update Password"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {!ready && (
              <p className="text-center text-xs text-muted-foreground">
                Open this page from the reset link in your email.{" "}
                <Link to="/forgot-password" className="text-primary hover:underline">Request a new link</Link>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import { startCheckout } from "@/lib/checkout";
import {
  User, MapPin, GraduationCap, DollarSign, Bell, Database,
  Shield, CreditCard, Palette, LogOut, Loader2, Trash2, Download,
  Lock, Sun, Moon, Monitor, Save, RefreshCw, KeyRound, Home
} from "lucide-react";

const Profile = () => {
  const { user, loading: authLoading, signOut, isSubscribed, subscriptionEnd } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Profile info state
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [cityState, setCityState] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [gpaRange, setGpaRange] = useState("");
  const [intendedMajor, setIntendedMajor] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // College preferences state
  const [prefDistance, setPrefDistance] = useState("No preference");
  const [prefCampusSize, setPrefCampusSize] = useState("No preference");
  const [prefRegion, setPrefRegion] = useState("No preference");
  const [prefBudget, setPrefBudget] = useState("No preference");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Notification preferences
  const [notifDeadlines, setNotifDeadlines] = useState(false);
  const [notifScholarships, setNotifScholarships] = useState(false);
  const [notifRecommendations, setNotifRecommendations] = useState(false);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifDashboard, setNotifDashboard] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Data management
  const [clearingData, setClearingData] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  // Subscription management
  const [openingPortal, setOpeningPortal] = useState(false);

  // Scroll to hash on mount
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Load profile data
  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    setFirstName(user.user_metadata?.first_name || "");

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name || "");
        if ((data as any).home_address) setHomeAddress((data as any).home_address);
      }
    })();

    // Load saved preferences from localStorage
    try {
      const saved = localStorage.getItem("collegra_profile_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCityState(parsed.cityState || "");
        setGradYear(parsed.gradYear || "");
        setGpaRange(parsed.gpaRange || "");
        setIntendedMajor(parsed.intendedMajor || "");
        setPrefDistance(parsed.prefDistance || "No preference");
        setPrefCampusSize(parsed.prefCampusSize || "No preference");
        setPrefRegion(parsed.prefRegion || "No preference");
        setPrefBudget(parsed.prefBudget || "No preference");
        setNotifDeadlines(parsed.notifDeadlines ?? false);
        setNotifScholarships(parsed.notifScholarships ?? false);
        setNotifRecommendations(parsed.notifRecommendations ?? false);
        setNotifEmail(parsed.notifEmail ?? false);
        setNotifDashboard(parsed.notifDashboard ?? true);
      }
    } catch { /* ignore */ }
  }, [user]);

  const saveProfilePrefsToLocal = useCallback(() => {
    localStorage.setItem("collegra_profile_prefs", JSON.stringify({
      cityState, gradYear, gpaRange, intendedMajor,
      prefDistance, prefCampusSize, prefRegion, prefBudget,
      notifDeadlines, notifScholarships, notifRecommendations, notifEmail, notifDashboard,
    }));
  }, [cityState, gradYear, gpaRange, intendedMajor, prefDistance, prefCampusSize, prefRegion, prefBudget,
    notifDeadlines, notifScholarships, notifRecommendations, notifEmail, notifDashboard]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await supabase.from("profiles").update({
        first_name: firstName,
        home_address: homeAddress,
      } as any).eq("id", user.id);
      saveProfilePrefsToLocal();
      toast({ title: "Profile saved", description: "Your information has been updated." });
    } catch {
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    }
    setSavingProfile(false);
  };

  const handleSavePreferences = () => {
    setSavingPrefs(true);
    saveProfilePrefsToLocal();
    setTimeout(() => {
      setSavingPrefs(false);
      toast({ title: "Preferences saved", description: "Your college preferences have been updated. Re-run matches from the Dashboard to see updated results." });
    }, 500);
  };

  const handleSaveNotifications = () => {
    saveProfilePrefsToLocal();
    toast({ title: "Notification preferences saved", description: "Your notification settings have been updated." });
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not change password.", variant: "destructive" });
    }
    setChangingPassword(false);
  };

  const handleClearSavedColleges = async () => {
    if (!user) return;
    setClearingData(true);
    try {
      await supabase.from("saved_colleges").delete().eq("user_id", user.id);
      toast({ title: "Saved colleges cleared", description: "All saved colleges have been removed." });
    } catch {
      toast({ title: "Error", description: "Could not clear data.", variant: "destructive" });
    }
    setClearingData(false);
  };

  const handleExportCSV = async () => {
    if (!user) return;
    setExportingData(true);
    try {
      const { data } = await supabase
        .from("saved_colleges")
        .select("*")
        .eq("user_id", user.id);
      if (!data || data.length === 0) {
        toast({ title: "No data", description: "You don't have any saved colleges to export." });
        setExportingData(false);
        return;
      }
      const headers = ["College Name", "Status", "Location", "Acceptance Rate", "Annual Price", "Fit Score", "Notes"];
      const rows = data.map(d => {
        const c = d.college_data as any;
        return [
          d.college_name,
          d.status,
          c?.location || "—",
          c?.acceptanceRate || "—",
          c?.tuitionOutOfState || "—",
          c?.fitScore || "—",
          (d.notes || "").replace(/"/g, '""'),
        ].map(v => `"${v}"`).join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "collegra-saved-colleges.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported!", description: "Your college list has been downloaded as CSV." });
    } catch {
      toast({ title: "Error", description: "Could not export data.", variant: "destructive" });
    }
    setExportingData(false);
  };

  const handleExportPDF = async () => {
    if (!user) return;
    setExportingData(true);
    try {
      const { data } = await supabase
        .from("saved_colleges")
        .select("*")
        .eq("user_id", user.id);
      if (!data || data.length === 0) {
        toast({ title: "No data", description: "You don't have any saved colleges to export." });
        setExportingData(false);
        return;
      }
      // Generate a printable HTML and trigger print dialog
      const esc = (s: any) => String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const rows = data.map(d => {
        const c = d.college_data as any;
        return `<tr><td>${esc(d.college_name)}</td><td>${esc(d.status)}</td><td>${esc(c?.location)}</td><td>${esc(c?.acceptanceRate)}</td><td>${esc(c?.tuitionOutOfState)}</td><td>${esc(c?.fitScore)}%</td></tr>`;
      }).join("");
      const html = `<html><head><title>Collegra - Saved Colleges</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:600}h1{font-size:20px;color:#333}</style></head><body><h1>Collegra™ — My Saved Colleges</h1><p>Exported on ${new Date().toLocaleDateString()}</p><table><tr><th>College</th><th>Status</th><th>Location</th><th>Acceptance Rate</th><th>Annual Price</th><th>Fit Score</th></tr>${rows}</table></body></html>`;
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
        w.print();
      }
      toast({ title: "PDF ready", description: "Use the print dialog to save as PDF." });
    } catch {
      toast({ title: "Error", description: "Could not generate PDF.", variant: "destructive" });
    }
    setExportingData(false);
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.no_customer) {
        toast({
          title: "No billing account yet",
          description: "Subscribe to Premium first to manage billing.",
        });
        return;
      }
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Error", description: "Could not open billing portal.", variant: "destructive" });
    }
    setOpeningPortal(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
  };

  const SectionHeader = ({ icon: Icon, title, id }: { icon: typeof User; title: string; id?: string }) => (
    <div id={id} className="flex items-center gap-3 mb-5 scroll-mt-24">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container px-4 pt-24 pb-16 max-w-3xl mx-auto space-y-10">
        <motion.div initial="hidden" animate="visible" variants={fadeIn} custom={0}>
          <p className="text-sm font-medium text-primary mb-1">Profile</p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Your Account</h1>
          <p className="text-muted-foreground">Manage your profile, preferences, and settings.</p>
        </motion.div>

        {/* 1. Profile Information */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={1}>
          <SectionHeader icon={User} title="Profile Information" />
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} disabled className="opacity-70" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cityState">City / State</Label>
                  <Input id="cityState" value={cityState} onChange={e => setCityState(e.target.value)} placeholder="e.g. Austin, TX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homeAddress" className="flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-primary" /> Home Address
                  </Label>
                  <Input id="homeAddress" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="e.g. 123 Main St, Austin, TX 78701" />
                  <p className="text-[10px] text-muted-foreground">Used to estimate travel options to your colleges</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradYear">Graduation Year</Label>
                  <Input id="gradYear" value={gradYear} onChange={e => setGradYear(e.target.value)} placeholder="e.g. 2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA Range</Label>
                  <Input id="gpa" value={gpaRange} onChange={e => setGpaRange(e.target.value)} placeholder="e.g. 3.5-3.8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="major">Intended Major / Interests</Label>
                  <Input id="major" value={intendedMajor} onChange={e => setIntendedMajor(e.target.value)} placeholder="e.g. Computer Science" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        {/* 2. College Preferences */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={2}>
          <SectionHeader icon={GraduationCap} title="College Preferences" />
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Distance from Home</Label>
                  <Select value={prefDistance} onValueChange={setPrefDistance}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No preference">No preference</SelectItem>
                      <SelectItem value="Under 100 miles">Under 100 miles</SelectItem>
                      <SelectItem value="100-300 miles">100-300 miles</SelectItem>
                      <SelectItem value="300-500 miles">300-500 miles</SelectItem>
                      <SelectItem value="500+ miles">500+ miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campus Size</Label>
                  <Select value={prefCampusSize} onValueChange={setPrefCampusSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No preference">No preference</SelectItem>
                      <SelectItem value="Small (under 5,000)">Small (under 5,000)</SelectItem>
                      <SelectItem value="Medium (5,000-15,000)">Medium (5,000-15,000)</SelectItem>
                      <SelectItem value="Large (15,000+)">Large (15,000+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Region</Label>
                  <Select value={prefRegion} onValueChange={setPrefRegion}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No preference">No preference</SelectItem>
                      <SelectItem value="Northeast">Northeast</SelectItem>
                      <SelectItem value="Southeast">Southeast</SelectItem>
                      <SelectItem value="Midwest">Midwest</SelectItem>
                      <SelectItem value="Southwest">Southwest</SelectItem>
                      <SelectItem value="West Coast">West Coast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget Range</Label>
                  <Select value={prefBudget} onValueChange={setPrefBudget}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No preference">No preference</SelectItem>
                      <SelectItem value="Under $15,000/yr">Under $15,000/yr</SelectItem>
                      <SelectItem value="$15,000-$30,000/yr">$15,000-$30,000/yr</SelectItem>
                      <SelectItem value="$30,000-$50,000/yr">$30,000-$50,000/yr</SelectItem>
                      <SelectItem value="$50,000+/yr">$50,000+/yr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">After saving, go to your Dashboard and re-run matches to see updated recommendations.</p>
              <Button onClick={handleSavePreferences} disabled={savingPrefs} className="gap-2">
                {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        {/* 3. Notifications */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={3}>
          <SectionHeader icon={Bell} title="Notifications" />
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Application deadline reminders</p>
                    <p className="text-xs text-muted-foreground">Get notified before deadlines approach</p>
                  </div>
                  <Switch checked={notifDeadlines} onCheckedChange={setNotifDeadlines} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Scholarship alerts</p>
                    <p className="text-xs text-muted-foreground">New scholarship opportunities for you</p>
                  </div>
                  <Switch checked={notifScholarships} onCheckedChange={setNotifScholarships} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">New college recommendations</p>
                    <p className="text-xs text-muted-foreground">When new matches are found for you</p>
                  </div>
                  <Switch checked={notifRecommendations} onCheckedChange={setNotifRecommendations} />
                </div>
                <Separator />
                <p className="text-sm font-semibold text-foreground">Delivery method</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Email reminders</p>
                  <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Dashboard notifications</p>
                  <Switch checked={notifDashboard} onCheckedChange={setNotifDashboard} />
                </div>
              </div>
              <Button onClick={handleSaveNotifications} variant="default" className="gap-2">
                <Save className="h-4 w-4" /> Save Notifications
              </Button>
            </CardContent>
          </Card>
        </motion.section>

        {/* 4. Saved Data Controls */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={4}>
          <SectionHeader icon={Database} title="Saved Data Controls" />
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleExportCSV} disabled={exportingData} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export as CSV
                </Button>
                <Button variant="outline" onClick={handleExportPDF} disabled={exportingData} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export as PDF
                </Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Danger zone</p>
                <p className="text-xs text-muted-foreground mb-3">These actions cannot be undone.</p>
                <Button
                  variant="destructive"
                  onClick={handleClearSavedColleges}
                  disabled={clearingData}
                  className="gap-2"
                >
                  {clearingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Clear All Saved Colleges
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* 5. Account Security */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={5}>
          <SectionHeader icon={Shield} title="Account Security" id="settings" />
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Change Password</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                  </div>
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="gap-2">
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  Update Password
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Session</p>
                <Button variant="outline" onClick={signOut} className="gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* 6. Subscription Management */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={6}>
          <SectionHeader icon={CreditCard} title="Subscription Management" />
          <Card className="bg-card border-border">
            <CardContent className="p-6 space-y-4">
              {isSubscribed ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Collegra Premium</p>
                      <p className="text-sm text-muted-foreground">$9.99/month</p>
                    </div>
                  </div>
                  {subscriptionEnd && (
                    <p className="text-xs text-muted-foreground">
                      Renews on {new Date(subscriptionEnd).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleManageBilling} disabled={openingPortal} className="gap-2">
                      {openingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Manage Billing
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    You're on the free plan. Upgrade to Collegra Premium for full access to Compare, Notes, Insights, and Map.
                  </p>
                  <Button onClick={() => startCheckout(toast)} className="gap-2">
                    <CreditCard className="h-4 w-4" /> Upgrade to Premium — $9.99/mo
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* 7. Theme / Appearance */}
        <motion.section initial="hidden" animate="visible" variants={fadeIn} custom={7}>
          <SectionHeader icon={Palette} title="Theme / Appearance" />
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => setTheme("light")}
                  className="gap-2"
                >
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => setTheme("dark")}
                  className="gap-2"
                >
                  <Moon className="h-4 w-4" /> Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  onClick={() => setTheme("system")}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" /> System
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
};

export default Profile;

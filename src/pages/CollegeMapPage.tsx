import { useState, useEffect, useMemo, lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { capture } from "@/lib/posthog";
import Header from "@/components/Header";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { College } from "@/types/college";

const CollegeMap = lazy(() => import("@/components/CollegeMap"));

// Error boundary to catch react-leaflet rendering issues
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CollegeMap error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-lg font-medium">Map failed to load</p>
          <p className="text-sm max-w-md text-center">{this.state.error?.message || "An unexpected error occurred."}</p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false })}>Try Again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CollegeMapPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [colleges, setColleges] = useState<College[]>([]);
  const [savedColleges, setSavedColleges] = useState<{ id: string; college_name: string; college_data: College }[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeLocation, setHomeLocation] = useState<string>("");
  const [homeAddress, setHomeAddress] = useState<string>("");
  const [savingCollege, setSavingCollege] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Load matches and saved colleges
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [matchRes, savedRes, profileRes] = await Promise.all([
        supabase
          .from("college_matches")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("saved_colleges")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single(),
      ]);

      if (matchRes.data?.[0]) {
        const collegeData = matchRes.data[0].college_data as unknown;
        if (Array.isArray(collegeData)) setColleges(collegeData as College[]);
      }

      if (savedRes.data) {
        setSavedColleges(
          savedRes.data.map(d => ({
            id: d.id,
            college_name: d.college_name,
            college_data: d.college_data as unknown as College,
          }))
        );
      }

      if (profileRes.data && (profileRes.data as any).home_address) {
        setHomeAddress((profileRes.data as any).home_address);
      }

      // Try to get home location from session storage (survey preferences)
      try {
        const raw = sessionStorage.getItem("latest_survey_preferences");
        if (raw) {
          const parsed = JSON.parse(raw);
          const cityState = parsed?.responses?.city_state || parsed?.responses?.cityState || "";
          if (cityState && typeof cityState === "string") setHomeLocation(cityState);
        }
      } catch { /* ignore */ }

      setLoading(false);
    };
    load();
  }, [user]);

  const savedNames = useMemo(
    () => new Set(savedColleges.map(s => s.college_name)),
    [savedColleges]
  );

  const handleSaveCollege = async (college: College) => {
    if (!user) return;
    if (savedNames.has(college.name)) return;

    setSavingCollege(college.name);
    try {
      const insertPayload: Record<string, unknown> = {
        user_id: user.id,
        college_name: college.name,
        college_data: college,
      };
      const { data, error } = await supabase
        .from("saved_colleges")
        .insert(insertPayload as any)
        .select()
        .single();

      if (error) {
        toast({ title: "Error saving", description: error.message, variant: "destructive" });
      } else if (data) {
        setSavedColleges(prev => [
          ...prev,
          { id: data.id, college_name: data.college_name, college_data: data.college_data as unknown as College },
        ]);
        toast({ title: "Saved!", description: `${college.name} added to your college list.` });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save college.", variant: "destructive" });
    }
    setSavingCollege(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container px-4 pt-24 pb-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">College Map</h1>
                <p className="text-sm text-muted-foreground">
                  Explore your {colleges.length + savedColleges.length} recommended and saved colleges across the US
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="shrink-0">
              ← Back to Dashboard
            </Button>
          </div>

          {/* Map */}
          <MapErrorBoundary>
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-32">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              <CollegeMap
                matchedColleges={colleges}
                savedColleges={savedColleges}
                homeLocation={homeLocation}
                homeAddress={homeAddress}
                savedCollegeNames={savedNames}
                onSaveCollege={handleSaveCollege}
                savingCollege={savingCollege}
                fullPage
              />
            </Suspense>
          </MapErrorBoundary>
        </motion.div>
      </main>
    </div>
  );
};

export default CollegeMapPage;

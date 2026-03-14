import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { posthog } from "@/lib/posthog";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSubscribed: boolean;
  subscriptionEnd: string | null;
  subscriptionLoading: boolean;
  refreshSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  isSubscribed: false,
  subscriptionEnd: null,
  subscriptionLoading: true,
  refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Ensure a profiles row exists for the current user (idempotent)
  const ensureProfile = useCallback(async (currentUser: User) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();
      if (!data) {
        await supabase.from("profiles").upsert({
          id: currentUser.id,
          email: currentUser.email ?? null,
          first_name: currentUser.user_metadata?.first_name ?? currentUser.email?.split("@")[0] ?? null,
        }, { onConflict: "id" });
      }
    } catch {
      // silent — profile will be created on next session
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      setIsSubscribed(false);
      setSubscriptionEnd(null);
      setSubscriptionLoading(false);
      return;
    }
    try {
      // Check if user is admin — admins get premium access
      const { data: isAdmin } = await (supabase.rpc as any)("has_role", {
        _user_id: currentSession.user.id,
        _role: "admin",
      });
      if (isAdmin) {
        setIsSubscribed(true);
        setSubscriptionEnd(null);
        setSubscriptionLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        // 401 = expired/invalid session — treat as not subscribed
        setIsSubscribed(false);
        return;
      }
      setIsSubscribed(data?.subscribed ?? false);
      setSubscriptionEnd(data?.subscription_end ?? null);
    } catch {
      // silent fail — keep current state
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        ensureProfile(session.user);
        checkSubscription();
      } else {
        setIsSubscribed(false);
        setSubscriptionEnd(null);
        setSubscriptionLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        ensureProfile(session.user);
        checkSubscription();
      } else {
        setSubscriptionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  // Auto-refresh subscription status every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, signOut,
      isSubscribed, subscriptionEnd, subscriptionLoading,
      refreshSubscription: checkSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

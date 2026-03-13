import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

const TALLY_URL = "https://tally.so/r/b5e0B2";
const TIMER_SECONDS = 90;

const FeedbackSurveyModal = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [feedbackCompleted, setFeedbackCompleted] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check feedback_completed on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("feedback_completed")
        .eq("id", user.id)
        .single();
      const completed = data?.feedback_completed ?? false;
      setFeedbackCompleted(completed);
    })();
  }, [user]);

  // Start timer only if feedback not completed
  useEffect(() => {
    if (feedbackCompleted !== false) return;

    timerRef.current = setTimeout(() => {
      setShowModal(true);
    }, TIMER_SECONDS * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [feedbackCompleted]);

  // Listen for Tally submission via postMessage
  useEffect(() => {
    if (!showSurvey) return;

    const handleMessage = async (event: MessageEvent) => {
      let payload: Record<string, unknown> | null = null;

      if (typeof event.data === "string") {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.event === "Tally.FormSubmitted") {
            payload = parsed;
          }
        } catch {
          // not JSON, ignore
        }
      }
      if (!payload && event.data?.event === "Tally.FormSubmitted") {
        payload = event.data;
      }

      if (payload) {
        await saveFeedbackAndComplete(payload);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showSurvey, user]);

  const saveFeedbackAndComplete = async (payload: Record<string, unknown>) => {
    if (!user) return;

    // Save feedback response (upsert to prevent duplicates)
    const { error } = await supabase
      .from("feedback_responses")
      .upsert(
        {
          user_id: user.id,
          response_data: payload as unknown as import("@/integrations/supabase/types").Json,
        },
        { onConflict: "user_id" }
      );

    // Only mark completed if save succeeded
    if (!error) {
      await supabase
        .from("profiles")
        .update({ feedback_completed: true })
        .eq("id", user.id);
    }

    setFeedbackCompleted(true);
    setShowSurvey(false);
    setShowModal(false);
  };

  if (!showModal || feedbackCompleted !== false) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        {!showSurvey ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card border border-border rounded-2xl shadow-elevated max-w-md w-full mx-4 p-8 text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
              <ClipboardList className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Help us improve Collegra
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              You've had a chance to explore your matches, and your feedback helps us improve recommendations. This survey takes less than 30 seconds.
            </p>
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => setShowSurvey(true)}
            >
              Start Survey
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl shadow-elevated w-full max-w-2xl mx-4 overflow-hidden"
            style={{ height: "80vh" }}
          >
            <iframe
              src={`${TALLY_URL}?transparentBackground=1&userId=${user?.id || ""}`}
              width="100%"
              height="100%"
              frameBorder="0"
              title="Collegra Feedback Survey"
              className="rounded-2xl"
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default FeedbackSurveyModal;

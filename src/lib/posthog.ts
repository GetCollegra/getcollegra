import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined" && import.meta.env.PROD) {
    posthog.init("phc_kK2o8PdZwlSGxjLn77yGxonp5MyfEfwotGiuooGwmAD", {
      api_host: "https://us.i.posthog.com",
      capture_pageview: true,
      autocapture: true,
      persistence: "localStorage+cookie",
    });
  }
};

/** Fire a custom PostHog event (no-ops in dev / when PostHog isn't loaded) */
export const capture = (event: string, properties?: Record<string, unknown>) => {
  try {
    posthog.capture(event, properties);
  } catch {
    // silent
  }
};

export { posthog };

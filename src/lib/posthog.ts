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

export { posthog };

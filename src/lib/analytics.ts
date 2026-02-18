// Google Analytics click tracking utility

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const trackClick = (
  buttonName: string,
  section: string,
  extra?: Record<string, string>
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "click", {
      event_category: section,
      event_label: buttonName,
      ...extra,
    });
  }
  // Also log in dev for easy debugging
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Click: "${buttonName}" in "${section}"`, extra ?? "");
  }
};

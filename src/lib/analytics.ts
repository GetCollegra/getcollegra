// Plausible Analytics click tracking utility

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

export const trackClick = (
  buttonName: string,
  section: string,
  extra?: Record<string, string>
) => {
  if (typeof window !== "undefined" && window.plausible) {
    window.plausible("Click", {
      props: {
        button: buttonName,
        section,
        ...extra,
      },
    });
  }
  // Also log in dev for easy debugging
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Click: "${buttonName}" in "${section}"`, extra ?? "");
  }
};

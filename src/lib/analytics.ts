// Clicky Analytics click tracking utility

declare global {
  interface Window {
    clicky?: {
      log: (href: string, title: string, type?: string) => void;
    };
  }
}

export const trackClick = (
  buttonName: string,
  section: string,
  extra?: Record<string, string>
) => {
  if (typeof window !== "undefined" && window.clicky) {
    window.clicky.log(`#${section}`, `Click: ${buttonName}`);
  }
  // Also log in dev for easy debugging
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Click: "${buttonName}" in "${section}"`, extra ?? "");
  }
};

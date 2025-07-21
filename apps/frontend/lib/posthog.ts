import posthog from "posthog-js";

export const initPostHog = () => {
  if (typeof window !== "undefined") {
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development")
            console.log("PostHog loaded");
        },
      });
  }
};

export { posthog };

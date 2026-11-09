export type SignupCorgiState =
  | "default"
  | "welcome"
  | "typing"
  | "password"
  | "success"
  | "error"
  | "loading";

export const SIGNUP_CORGI_FALLBACK = "/mascot/signup/signup-main.png?v=3";

/**
 * Single editable manifest mapping UI state -> mascot image path.
 * Adding a new state or swapping an asset (e.g. signup-password-hide.png) is a one-line change.
 */
export const SIGNUP_CORGI_MANIFEST: Record<SignupCorgiState, string> = {
  default: "/mascot/signup/signup-main.png?v=3",
  welcome: "/mascot/signup/signup-main.png?v=3",
  typing: "/mascot/signup/signup-tl.png?v=3",
  password: "/mascot/signup/signup-tr.png?v=3",
  success: "/mascot/signup/signup-br.png?v=3",
  error: "/mascot/signup/signup-bl.png?v=3",
  loading: "/mascot/signup/signup-main.png?v=3",
};

export const SIGNUP_CORGI_ALT: Record<SignupCorgiState, string> = {
  default: "Friendly standing corgi student mascot welcoming you",
  welcome: "Friendly standing corgi student mascot welcoming you",
  typing: "Attentive corgi student mascot watching as you type",
  password: "Polite corgi student mascot standing at attention for your password",
  success: "Happy corgi student mascot celebrating your account",
  error: "Concerned corgi student mascot noticing a form error",
  loading: "Patient corgi student mascot waiting while your request loads",
};

/** Resolves a UI state to its mascot image path, falling back to signup-main if missing. */
export function getSignupCorgiSrc(state?: SignupCorgiState | string): string {
  if (!state) return SIGNUP_CORGI_FALLBACK;
  return (
    SIGNUP_CORGI_MANIFEST[state as SignupCorgiState] ?? SIGNUP_CORGI_FALLBACK
  );
}

/** Deduplicated list of all image paths in the manifest for stacked preloading. */
export const SIGNUP_CORGI_IMAGES: string[] = Array.from(
  new Set([SIGNUP_CORGI_FALLBACK, ...Object.values(SIGNUP_CORGI_MANIFEST)]),
);


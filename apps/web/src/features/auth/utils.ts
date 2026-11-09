import type { InApp } from "./types";

/**
 * Apps like Messenger, Facebook, Instagram and TikTok open links in their own
 * built-in browser. Google blocks sign-in there, or finishes it in a different
 * browser, which breaks the login. We spot those browsers and offer to reopen
 * xor in Safari or Chrome instead.
 */
const APPS: [RegExp, string][] = [
  [/FBAN\/Messenger|MessengerForiOS|MessengerLite|Orca-Android/i, "Messenger"],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, "Facebook"],
  [/Instagram/i, "Instagram"],
  [/musical_ly|TikTok|BytedanceWebview|trill/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
  [/\bLine\//i, "LINE"],
  [/Twitter|TwitterAndroid/i, "X"],
  [/LinkedInApp/i, "LinkedIn"],
  [/Discord/i, "Discord"],
  [/Telegram/i, "Telegram"],
  [/MicroMessenger/i, "WeChat"],
];

export function detectInApp(ua: string): InApp {
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  for (const [re, app] of APPS) if (re.test(ua)) return { app, ios, android };
  // generic Android WebView ("; wv)") — e.g. links opened inside other apps
  if (android && /; wv\)/.test(ua)) return { app: "this app", ios, android };
  return null;
}

/** A link that asks the phone to open this page in its real browser. */
export function openInBrowserHref(url: string, inApp: NonNullable<InApp>): string | null {
  const u = new URL(url);
  if (inApp.android) {
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  }
  if (inApp.ios) return `x-safari-${url}`; // iOS 17+ opens Safari
  return null;
}

/** Turn Supabase's technical auth errors into something a person can act on. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("code verifier") || m.includes("pkce") || m.includes("code challenge") || m.includes("flow state"))
    return "Google sign-in started in one browser but finished in another (this happens in Messenger, Instagram and other in-app browsers). Open xor in Safari or Chrome and try again, or log in with email.";
  if (m.includes("expired") || m.includes("invalid")) return "That sign-in link expired. Try again.";
  if (m.includes("access_denied") || m.includes("denied")) return "Google sign-in was cancelled.";
  return message;
}


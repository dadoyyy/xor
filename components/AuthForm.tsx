"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useNav } from "@/lib/useNav";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";
import { detectInApp, openInBrowserHref, type InApp } from "@/lib/inAppBrowser";
import { Check, Copy, ExternalLink, TriangleAlert } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const supabase = createClient();
  const { go, pending } = useNav();
  const params = useSearchParams();
  const next = params.get("next") || "/rooms";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setBusy] = useState(false);
  const busy = working || pending;
  const [error, setError] = useState<string | null>(params.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const [inApp, setInApp] = useState<InApp>(null);
  const [showOpenOut, setShowOpenOut] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const found = detectInApp(navigator.userAgent);
    setInApp(found);
    // came back from a failed Google sign-in inside an app's browser: explain right away
    if (found && params.get("error")) setShowOpenOut(true);
  }, [params]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const callback = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  async function google() {
    // Google sign-in doesn't work inside Messenger/Instagram/etc. browsers
    if (inApp) {
      setShowOpenOut(true);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback(next) },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        go(next, { replace: true, refresh: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callback("/onboarding") },
        });
        if (error) throw error;
        if (data.session) {
          go("/onboarding", { replace: true, refresh: true });
        } else {
          setNotice("Check your email for a confirmation link, then come back here.");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callback("/reset-password"),
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password";

  const sub =
    mode === "login"
      ? "Log in to get back to your study rooms."
      : mode === "signup"
        ? "It's free. You'll pick a username next."
        : "We'll email you a link to set a new password.";

  return (
    <AuthShell mood={mode === "forgot" ? "think" : "happy"}>
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-1 text-ink-soft">{sub}</p>

        {mode !== "forgot" && (
          <>
            <button type="button" onClick={google} disabled={busy} className="btn mt-6 w-full">
              <GoogleIcon /> Continue with Google
            </button>
            {showOpenOut && inApp && (
              <div className="pop mt-3 rounded-2xl border-2 border-sun bg-sun-tint p-4" role="alert">
                <p className="flex items-start gap-2 font-display font-semibold">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0 text-sun-deep" />
                  Google sign-in doesn&apos;t work inside {inApp.app}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Open xor in {inApp.android ? "Chrome" : inApp.ios ? "Safari" : "your phone's browser"} and tap Continue with Google there. Or log in
                  with email below, which works here.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const href = typeof window !== "undefined" ? openInBrowserHref(location.origin + location.pathname, inApp) : null;
                    return href ? (
                      <a href={href} className="btn btn-primary btn-sm">
                        <ExternalLink size={16} /> Open in {inApp.android ? "Chrome" : "Safari"}
                      </a>
                    ) : null;
                  })()}
                  <button type="button" onClick={copyLink} className="btn btn-sm">
                    {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Link copied" : "Copy link"}
                  </button>
                </div>
                {inApp.ios && (
                  <p className="mt-2 text-xs text-ink-soft">
                    If nothing opens: tap the ••• or share button in {inApp.app}, then choose &quot;Open in Safari&quot; (or paste the link there).
                  </p>
                )}
              </div>
            )}
            <div className="my-5 flex items-center gap-3 text-sm font-bold text-ink-soft">
              <span className="h-0.5 flex-1 rounded bg-line/20" />
              or with email
              <span className="h-0.5 flex-1 rounded bg-line/20" />
            </div>
          </>
        )}

        <form onSubmit={submit} className={`grid gap-4 ${mode === "forgot" ? "mt-6" : ""}`}>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>}
            </div>
          )}

          {error && !(showOpenOut && inApp) && <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">{error}</p>}
          {notice && <p className="rounded-xl border-2 border-mint bg-mint-tint px-3 py-2 text-sm font-semibold">{notice}</p>}

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy && <span className="spinner" aria-hidden />}
            {busy ? "One sec…" : mode === "login" ? "Log in" : mode === "signup" ? "Sign up" : "Send reset link"}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm font-semibold">
          {mode === "login" && (
            <>
              <Link href="/signup" className="text-grape underline-offset-4 hover:underline">
                New here? Sign up
              </Link>
              <Link href="/forgot" className="text-ink-soft underline-offset-4 hover:underline">
                Forgot password?
              </Link>
            </>
          )}
          {mode === "signup" && (
            <Link href="/login" className="text-grape underline-offset-4 hover:underline">
              Already have an account? Log in
            </Link>
          )}
          {mode === "forgot" && (
            <Link href="/login" className="text-grape underline-offset-4 hover:underline">
              Back to log in
            </Link>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

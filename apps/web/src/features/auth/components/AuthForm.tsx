"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, TriangleAlert } from "lucide-react";
import Mascot from "@/components/ui/Mascot";
import CorgiLoader from "@/components/mascot/CorgiLoader";
import type { SignupCorgiState } from "@/lib/mascot/signup";
import { useNav } from "@/hooks/useNav";
import {
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogleOAuth,
  signUpWithEmail,
} from "../services/authClientService";
import type { AuthMode, InApp } from "../types";
import { detectInApp, openInBrowserHref } from "../utils";
import AuthShell from "./AuthShell";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export default function AuthForm({ mode: initialMode }: { mode: AuthMode }) {
  const { go, pending } = useNav();
  const params = useSearchParams();
  const next = params.get("next") || "/home";
  const [activeMode, setActiveMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [working, setBusy] = useState(false);
  const busy = working || pending;
  const [error, setError] = useState<string | null>(params.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const [inApp, setInApp] = useState<InApp>(null);
  const [showOpenOut, setShowOpenOut] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const found = detectInApp(navigator.userAgent);
    setInApp(found);
    if (found && params.get("error")) setShowOpenOut(true);
  }, [params]);

  const corgiState: SignupCorgiState = busy
    ? "loading"
    : succeeded || notice
      ? "success"
      : error
        ? "error"
        : focusedField === "password"
          ? "password"
          : focusedField === "email"
            ? "typing"
            : "welcome";

  function switchTab(target: AuthMode) {
    setActiveMode(target);
    setError(null);
    setNotice(null);
    setSucceeded(false);
    if (typeof window !== "undefined") {
      const search = window.location.search;
      const path = target === "login" ? "/login" : target === "signup" ? "/signup" : "/forgot";
      window.history.replaceState(null, "", `${path}${search}`);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin + location.pathname);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const callback = (to: string) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  async function google() {
    if (inApp) {
      setShowOpenOut(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogleOAuth(callback(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (activeMode !== "forgot" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    setSucceeded(false);
    try {
      if (activeMode === "login") {
        await signInWithEmail(email, password);
        setSucceeded(true);
        go(next, { replace: true, refresh: true });
      } else if (activeMode === "signup") {
        const data = await signUpWithEmail(email, password, callback("/onboarding"));
        setSucceeded(true);
        if (data.session) {
          go("/onboarding", { replace: true, refresh: true });
        } else {
          setNotice("Check your email for a confirmation link, then come back here.");
        }
      } else {
        await requestPasswordReset(email, callback("/reset-password"));
        setSucceeded(true);
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="fade-in fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center bg-lilac px-4 py-12">
        <CorgiLoader variant="default" size={140} />
      </div>
    );
  }

  return (
    <AuthShell corgiState={corgiState}>
      <div data-surface="white" className="card p-6 sm:p-7">
        {/* Segmented Pill Toggle Bar (switches ONLY the right tab) */}
        {activeMode !== "forgot" ? (
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-1.5 rounded-full border border-[rgba(109,59,232,0.22)] bg-[#F5F1FD] p-1 select-none"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "login"}
              onClick={() => switchTab("login")}
              className={`rounded-full py-2 font-display text-sm font-bold transition-all cursor-pointer ${
                activeMode === "login"
                  ? "bg-[#6D3BE8] text-white shadow-none"
                  : "text-[#5B5480] hover:text-[#2B1B5A] hover:bg-white/50"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMode === "signup"}
              onClick={() => switchTab("signup")}
              className={`rounded-full py-2 font-display text-sm font-bold transition-all cursor-pointer ${
                activeMode === "signup"
                  ? "bg-[#6D3BE8] text-white shadow-none"
                  : "text-[#5B5480] hover:text-[#2B1B5A] hover:bg-white/50"
              }`}
            >
              Create account
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => switchTab("login")}
            className="btn btn-ghost btn-sm -ml-2 mb-1 rounded-full text-ink-soft hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to log in
          </button>
        )}

        {/* Welcome Header + Reactive Standing Corgi inside Card */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">
              {activeMode === "login"
                ? "Welcome back!"
                : activeMode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">
              {activeMode === "login"
                ? "Sign in to access your rooms, calendar, and streak."
                : activeMode === "signup"
                  ? "Free forever. You'll pick your study handle next."
                  : "Enter your email and we'll send a password reset link."}
            </p>
          </div>
          <div className="shrink-0">
            <Mascot
              mood={
                activeMode === "login"
                  ? "winking"
                  : activeMode === "signup"
                    ? "cheering"
                    : "confused"
              }
              size="sm"
              surface="white"
            />
          </div>
        </div>

        {/* OAuth + Divider */}
        {activeMode !== "forgot" && (
          <>
            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="btn btn-md mt-4 w-full flex items-center justify-center gap-2.5 rounded-full bg-white hover:bg-[#F3EEFC] text-[#2B1B5A] border border-[rgba(109,59,232,0.22)] shadow-none transition-all active:scale-[0.98] font-display text-sm font-bold cursor-pointer"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {showOpenOut && inApp && (
              <div
                className="pop mt-3 rounded-2xl border-2 border-sun bg-sun-tint p-3.5"
                role="alert"
              >
                <p className="flex items-start gap-2 font-display text-sm font-semibold">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0 text-sun-deep" />
                  Google sign-in doesn&apos;t work inside {inApp.app}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {(() => {
                    const href =
                      typeof window !== "undefined"
                        ? openInBrowserHref(location.origin + location.pathname, inApp)
                        : null;
                    return href ? (
                      <a href={href} className="btn btn-primary btn-sm">
                        <ExternalLink size={15} /> Open in{" "}
                        {inApp.android ? "Chrome" : "Safari"}
                      </a>
                    ) : null;
                  })()}
                  <button type="button" onClick={copyLink} className="btn btn-sm">
                    {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                    {copied ? "Link copied" : "Copy link"}
                  </button>
                </div>
              </div>
            )}

            <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              <span className="h-0.5 flex-1 rounded bg-line" />
              {activeMode === "login" ? "or sign in with email" : "or sign up with email"}
              <span className="h-0.5 flex-1 rounded bg-line" />
            </div>
          </>
        )}

        {/* Email & Password Form */}
        <form
          onSubmit={submit}
          noValidate
          className="grid gap-3.5"
        >
          <div>
            <label className="label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@university.edu"
              autoComplete="email"
              className="input"
              value={email}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField((prev) => (prev === "email" ? null : prev))}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>

          {activeMode !== "forgot" && (
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder={
                  activeMode === "signup"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                autoComplete={
                  activeMode === "signup" ? "new-password" : "current-password"
                }
                className="input"
                value={password}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField((prev) => (prev === "password" ? null : prev))}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
              />
              {activeMode === "login" && (
                <div className="mt-1.5 flex justify-end text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => switchTab("forgot")}
                    className="cursor-pointer font-bold text-grape underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>
          )}

          {error && !(showOpenOut && inApp) && (
            <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-sm font-semibold">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl border-2 border-mint bg-mint-tint px-3 py-2 text-sm font-semibold">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary btn-md mt-1 w-full rounded-full shadow-none font-display font-bold text-sm sm:text-base h-11 cursor-pointer transition-all active:scale-[0.98]"
          >
            {busy && <span className="spinner" aria-hidden />}
            {busy
              ? "One sec…"
              : activeMode === "login"
                ? "Log in"
                : activeMode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

"use client";

import { FormEvent, useState } from "react";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const isSignup = mode === "signup";
    try {
      const response = await fetch(`/api/auth/${isSignup ? "sign-up" : "sign-in"}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "Could not sign you in. Check the details and try again.");
      window.location.assign("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication is unavailable. Check the database setup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="WashPadi home">
          <span className="brand-mark">w</span><span className="brand-name">washpadi<span>.</span></span>
        </a>
        <p className="eyebrow">YOUR LAUNDRY, IN GOOD HANDS</p>
        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-subtitle">{mode === "signin" ? "Sign in to follow your orders and pickup times." : "Create a customer account to keep your laundry orders together."}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label>Full name<input name="name" autoComplete="name" minLength={2} maxLength={100} required placeholder="Your name" /></label>}
          <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} maxLength={128} required placeholder="At least 8 characters" /></label>
          {message && <p className="auth-message" role="alert">{message}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}<span>→</span></button>
        </form>
        <p className="auth-switch">{mode === "signin" ? "New to WashPadi?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <div className="auth-demo-note"><strong>Class project demo</strong><span>Online payments are simulated. No card details are requested and no real money is charged.</span></div>
        <a className="auth-back" href="/">← Back to WashPadi</a>
      </section>
    </main>
  );
}

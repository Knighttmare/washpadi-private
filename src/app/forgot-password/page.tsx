"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Notice = { kind: "success" | "error"; text: string } | null;

export default function ForgotPasswordPage() {
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      if (!response.ok) throw new Error("We couldn't process that request. Please try again shortly.");
      setSubmitted(true);
      setNotice({ kind: "success", text: "If an account exists with this email, a password reset link has been sent." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "We couldn't send the request. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card recovery-card rounded-3xl shadow-xl">
        <a className="brand auth-brand" href="/" aria-label="WashPadi home">
          <span className="brand-mark">w</span><span className="brand-name">washpadi<span>.</span></span>
        </a>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Forgot your password?</h1>
        <p className="auth-subtitle">Enter the email address on your WashPadi account and we’ll send a secure reset link.</p>
        {!submitted ? (
          <form className="auth-form" onSubmit={submit}>
            <label>Email address<Input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
            <Button className="primary-button auth-submit" disabled={busy}>{busy ? "Sending link…" : "Send reset link"}<span>→</span></Button>
          </form>
        ) : (
          <div className="recovery-confirmation"><span aria-hidden="true">✉</span><strong>Check your inbox</strong><p>Also check your spam folder. The reset link expires after one hour.</p></div>
        )}
        {notice && <div className={`auth-toast ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"} aria-live={notice.kind === "error" ? "assertive" : "polite"}>{notice.text}</div>}
        <a className="auth-back" href="/login">← Back to sign in</a>
      </section>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Notice = { kind: "success" | "error"; text: string } | null;

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
    setInvalidLink(!params.get("token") || Boolean(params.get("error")));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (password !== confirm) {
      setNotice({ kind: "error", text: "Those passwords don’t match. Please check and try again." });
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "This reset link may have expired. Request a new one and try again.");
      setComplete(true);
      setNotice({ kind: "success", text: "Your password has been updated. You can now sign in." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "We couldn’t update your password. Request a new link and try again." });
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
        <h1>{complete ? "Password updated" : "Choose a new password"}</h1>
        <p className="auth-subtitle">{complete ? "Your WashPadi account is ready to use again." : "Choose a strong password with at least 8 characters."}</p>
        {invalidLink ? (
          <div className="recovery-confirmation recovery-invalid"><strong>This reset link is invalid or expired.</strong><p>Request a new reset link to continue.</p><a className="primary-button" href="/forgot-password">Request a new link <span>→</span></a></div>
        ) : complete ? (
          <div className="recovery-confirmation"><span aria-hidden="true">✓</span><strong>All set</strong><p>Your password was changed successfully.</p><a className="primary-button" href="/login">Go to sign in <span>→</span></a></div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label>New password<Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="At least 8 characters" /></label>
            <label>Confirm new password<Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Enter it again" /></label>
            <Button className="primary-button auth-submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}<span>→</span></Button>
          </form>
        )}
        {notice && <div className={`auth-toast ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"} aria-live={notice.kind === "error" ? "assertive" : "polite"}>{notice.text}</div>}
        {!complete && <a className="auth-back" href="/login">← Back to sign in</a>}
      </section>
    </main>
  );
}

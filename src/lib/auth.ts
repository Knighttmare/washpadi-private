import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";

function createAuth() {
  return betterAuth({
      database: getDb(),
      emailAndPassword: {
        enabled: true,
        revokeSessionsOnPasswordReset: true,
        sendResetPassword: async ({ user, url }) => {
          const apiKey = process.env.RESEND_API_KEY;
          const from = process.env.WASHPADI_FROM_EMAIL;
          if (!apiKey || !from) {
            console.error("WashPadi password reset email is not configured (missing Resend sender settings).");
            return;
          }

          const safeUrl = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
          try {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from,
                to: [user.email],
                subject: "Reset your WashPadi password",
                text: `We received a request to reset your WashPadi password. Use this link within one hour: ${url}\n\nIf you did not request this, you can ignore this email.`,
                html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;padding:28px;border:1px solid #e3e8e5;border-radius:16px;color:#12251f"><p style="color:#14806a;font-weight:700">WashPadi</p><h1 style="font-size:24px">Reset your password</h1><p>We received a request to reset your WashPadi password. This link expires in one hour.</p><p><a href="${safeUrl}" style="display:inline-block;background:#108a78;color:white;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">Choose a new password</a></p><p style="color:#65736e;font-size:13px">If you did not request this, you can ignore this email.</p></div>`,
              }),
            });
            if (!response.ok) console.error("WashPadi password reset email delivery failed:", response.status);
          } catch (error) {
            console.error("WashPadi password reset email delivery failed:", error instanceof Error ? error.message : "Unknown email error");
          }
        },
      },
      user: {
        additionalFields: {
          role: {
            type: "string",
            required: false,
            defaultValue: "customer",
            input: false,
          },
        },
      },
      session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
      plugins: [nextCookies()],
    });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth(): ReturnType<typeof createAuth> {
  authInstance ??= createAuth();
  return authInstance;
}

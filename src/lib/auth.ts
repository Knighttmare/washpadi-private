import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";

function createAuth() {
  return betterAuth({
      database: getDb(),
      emailAndPassword: { enabled: true },
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

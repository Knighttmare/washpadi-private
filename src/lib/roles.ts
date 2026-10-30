import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export type AppRole = "customer" | "staff" | "owner";

export async function getCurrentAppUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const email = session.user.email.trim().toLowerCase();
  const ownerEmail = process.env.WASHPADI_OWNER_EMAIL?.trim().toLowerCase();
  const initialRole: AppRole = ownerEmail && email === ownerEmail ? "owner" : "customer";
  const db = getDb();
  const { rows } = await db.query<{ role: AppRole }>(
    `INSERT INTO app_user_roles (auth_user_id, email, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (auth_user_id) DO UPDATE SET email = EXCLUDED.email,
       role = CASE WHEN EXCLUDED.role = 'owner' THEN 'owner' ELSE app_user_roles.role END
     RETURNING role`,
    [session.user.id, email, initialRole],
  );

  return { ...session.user, role: rows[0]?.role ?? "customer" as AppRole };
}

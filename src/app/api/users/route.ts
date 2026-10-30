import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  if (user.role !== "owner") return Response.json({ message: "Owner access is required." }, { status: 403 });
  try {
    const { rows } = await getDb().query(
      `SELECT u.id, u.name, u.email, r.role, r.created_at AS joined_at
         FROM app_user_roles r JOIN "user" u ON u.id = r.auth_user_id
        ORDER BY r.created_at DESC LIMIT 500`,
    );
    return Response.json({ users: rows });
  } catch { return Response.json({ message: "Team members are temporarily unavailable." }, { status: 503 }); }
}

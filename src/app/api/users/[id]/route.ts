import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  if (user.role !== "owner") return Response.json({ message: "Owner access is required." }, { status: 403 });
  const { id } = await context.params;
  if (id === user.id) return Response.json({ message: "Your own owner access cannot be changed here." }, { status: 400 });
  let body: { role?: unknown };
  try { body = await request.json(); } catch { return Response.json({ message: "Send valid JSON." }, { status: 400 }); }
  if (body.role !== "customer" && body.role !== "staff") {
    return Response.json({ message: "Choose customer or staff." }, { status: 400 });
  }
  try {
    const { rows } = await getDb().query(
      `UPDATE app_user_roles SET role = $2 WHERE auth_user_id = $1 AND role <> 'owner'
       RETURNING auth_user_id, email, role`, [id, body.role],
    );
    if (!rows[0]) return Response.json({ message: "Member not found, or this is another owner account." }, { status: 404 });
    return Response.json({ user: rows[0] });
  } catch { return Response.json({ message: "Could not update this member's role." }, { status: 503 }); }
}

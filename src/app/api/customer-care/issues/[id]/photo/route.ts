import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return new Response("Please sign in.", { status: 401 });
  const { id } = await context.params;
  try {
    const { rows } = await getDb().query<{ photo_data_url: string | null }>(
      `SELECT l.photo_data_url FROM customer_issue_logs l JOIN customers c ON c.id = l.customer_id
        WHERE l.id = $1 AND ($2::boolean = TRUE OR c.auth_user_id = $3)`,
      [id, user.role === "staff" || user.role === "owner", user.id],
    );
    const match = rows[0]?.photo_data_url?.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return new Response("Photo not found.", { status: 404 });
    return new Response(Buffer.from(match[2], "base64"), {
      headers: { "Content-Type": `image/${match[1]}`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch { return new Response("Photo unavailable.", { status: 503 }); }
}

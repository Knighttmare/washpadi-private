import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/orders";

export async function GET() {
  const access = await requireStaff().catch(() => null);
  if (!access) return Response.json({ message: "Please sign in." }, { status: 401 });
  if ("error" in access) return access.error;
  try {
    const { rows } = await getDb().query(
      `SELECT p.id, o.order_number, c.name AS customer_name, c.email AS customer_email,
              p.amount, p.method, p.status, p.is_demo, p.created_at
         FROM payments p JOIN orders o ON o.id = p.order_id
         JOIN customers c ON c.id = o.customer_id
        ORDER BY p.created_at DESC LIMIT 500`,
    );
    return Response.json({ payments: rows });
  } catch { return Response.json({ message: "Payments are temporarily unavailable." }, { status: 503 }); }
}

import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/orders";

export async function GET() {
  const access = await requireStaff().catch(() => null);
  if (!access) return Response.json({ message: "Please sign in." }, { status: 401 });
  if ("error" in access) return access.error;
  try {
    const { rows } = await getDb().query(
      `SELECT c.id, c.name, c.email, c.phone, c.created_at,
              COUNT(DISTINCT o.id)::int AS order_count,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('Paid (demo)', 'Paid at pickup')), 0) AS paid_total
         FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
         LEFT JOIN payments p ON p.order_id = o.id
        GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500`,
    );
    return Response.json({ customers: rows });
  } catch { return Response.json({ message: "Customers are temporarily unavailable." }, { status: 503 }); }
}

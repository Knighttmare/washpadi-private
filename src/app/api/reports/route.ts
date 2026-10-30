import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  if (user.role !== "owner") return Response.json({ message: "Owner access is required." }, { status: 403 });
  try {
    const { rows } = await getDb().query(
      `SELECT COUNT(*)::int AS total_orders,
              COUNT(*) FILTER (WHERE status = 'Received')::int AS received,
              COUNT(*) FILTER (WHERE status = 'Washing')::int AS washing,
              COUNT(*) FILTER (WHERE status = 'Ready')::int AS ready,
              COALESCE((SELECT SUM(amount) FROM payments WHERE status IN ('Paid (demo)', 'Paid at pickup')), 0) AS paid_total,
              (SELECT COUNT(*)::int FROM customers) AS customers
         FROM orders`,
    );
    return Response.json({ report: rows[0] });
  } catch { return Response.json({ message: "Reports are temporarily unavailable." }, { status: 503 }); }
}

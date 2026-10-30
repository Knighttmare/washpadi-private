import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

export async function GET() {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  try {
    const customerOnly = user.role === "customer";
    const { rows } = await getDb().query(
      `SELECT COUNT(*)::int AS total_orders,
              COUNT(*) FILTER (WHERE o.status = 'Received')::int AS received,
              COUNT(*) FILTER (WHERE o.status = 'Washing')::int AS washing,
              COUNT(*) FILTER (WHERE o.status = 'Ready')::int AS ready,
              COALESCE((SELECT SUM(p.amount) FROM payments p JOIN orders po ON po.id = p.order_id
                         JOIN customers pc ON pc.id = po.customer_id
                        WHERE p.status IN ('Paid (demo)', 'Paid at pickup')
                          AND ($1::boolean = false OR pc.auth_user_id = $2)), 0) AS paid_total,
              (SELECT COUNT(*)::int FROM customers c WHERE ($1::boolean = false OR c.auth_user_id = $2)) AS customers
         FROM orders o JOIN customers c ON c.id = o.customer_id
        WHERE ($1::boolean = false OR c.auth_user_id = $2)`,
      [customerOnly, user.id],
    );
    const report = rows[0];
    return Response.json({ overview: {
      totalOrders: Number(report.total_orders), received: Number(report.received),
      washing: Number(report.washing), ready: Number(report.ready),
      paidTotal: Number(report.paid_total), customers: Number(report.customers),
    } });
  } catch { return Response.json({ message: "Overview is temporarily unavailable." }, { status: 503 }); }
}

import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

export type OrderStatus = "Received" | "Washing" | "Ready";
export type AppUser = NonNullable<Awaited<ReturnType<typeof getCurrentAppUser>>>;

export async function requireStaff() {
  const user = await getCurrentAppUser();
  if (!user) return { error: Response.json({ message: "Please sign in." }, { status: 401 }) };
  if (user.role !== "staff" && user.role !== "owner") {
    return { error: Response.json({ message: "Staff access is required." }, { status: 403 }) };
  }
  return { user };
}

export async function sendOrderEmail(data: { customerName: string; customerEmail: string; orderNumber: string; status: "received" | "ready" }) {
  const webhookUrl = process.env.MAKE_WASHPADI_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, event: data.status === "received" ? "order_placed" : "order_ready" }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendReadyEmail(data: { customerName: string; customerEmail: string; orderNumber: string }) {
  return sendOrderEmail({ ...data, status: "ready" });
}

export async function listOrdersForUser(user: AppUser) {
  const db = getDb();
  const customerOnly = user.role === "customer";
  const { rows } = await db.query(
    `SELECT o.id, o.order_number, o.status, o.pickup_at, o.payment_method, o.payment_status,
            o.created_at, c.name AS customer_name, c.email AS customer_email, c.phone,
            COALESCE(json_agg(json_build_object('id', i.id, 'tag', i.tag, 'name', i.name, 'service', i.service,
                       'price', i.price) ORDER BY i.created_at) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM orders o JOIN customers c ON c.id = o.customer_id
       LEFT JOIN order_items i ON i.order_id = o.id
      WHERE ($1::boolean = false OR c.auth_user_id = $2)
      GROUP BY o.id, c.id
      ORDER BY o.created_at DESC LIMIT 200`,
    [customerOnly, user.id],
  );
  return rows;
}

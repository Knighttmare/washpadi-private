import { getDb } from "@/lib/db";
import { sendOrderEmail, requireStaff } from "@/lib/orders";

const validStatuses = new Set(["Received", "Washing", "Ready"]);
type QuoteItem = { id?: unknown; price?: unknown };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireStaff().catch(() => null);
  if (!access) return Response.json({ message: "Please sign in." }, { status: 401 });
  if ("error" in access) return access.error;
  let body: { status?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return Response.json({ message: "Send valid JSON." }, { status: 400 }); }
  const { id } = await context.params;
  const db = getDb();

  if (Array.isArray(body.items)) {
    const incoming = body.items.slice(0, 20) as QuoteItem[];
    if (!incoming.length || incoming.some((item) => typeof item.id !== "string" || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || Number(item.price) > 1_000_000)) {
      return Response.json({ message: "Enter a valid price for every order item." }, { status: 400 });
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const { rows: orderRows } = await client.query<{ order_number: string; payment_method: string; customer_name: string; customer_email: string }>(
        `SELECT o.order_number, o.payment_method, c.name AS customer_name, c.email AS customer_email
           FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = $1 FOR UPDATE OF o`, [id]);
      if (!orderRows[0]) { await client.query("ROLLBACK"); return Response.json({ message: "Order not found." }, { status: 404 }); }
      const { rows: existing } = await client.query<{ id: string }>("SELECT id FROM order_items WHERE order_id = $1", [id]);
      if (existing.length !== incoming.length || incoming.some((item) => !existing.some((row) => row.id === item.id))) {
        await client.query("ROLLBACK"); return Response.json({ message: "Order items changed. Refresh and try again." }, { status: 409 });
      }
      for (const item of incoming) await client.query("UPDATE order_items SET price = $3 WHERE order_id = $1 AND id = $2", [id, item.id, Number(item.price)]);
      const total = incoming.reduce((sum, item) => sum + Number(item.price), 0);
      const status = orderRows[0].payment_method === "Demo online" ? "Paid (demo)" : "Due at pickup";
      await client.query("UPDATE orders SET payment_status = $2, updated_at = NOW() WHERE id = $1", [id, status]);
      await client.query("INSERT INTO payments (order_id, amount, method, status, is_demo) VALUES ($1, $2, $3, $4, TRUE)", [id, total, orderRows[0].payment_method, status]);
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      return Response.json({ message: "Could not save the price quote." }, { status: 503 });
    } finally { client.release(); }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !validStatuses.has(body.status)) return Response.json({ message: "Choose Received, Washing, or Ready." }, { status: 400 });
    try {
      const { rows } = await db.query<{ order_number: string; status: string; customer_name: string; customer_email: string }>(
        `UPDATE orders o SET status = $2, updated_at = NOW()
           FROM customers c WHERE o.id = $1 AND o.customer_id = c.id
         RETURNING o.order_number, o.status, c.name AS customer_name, c.email AS customer_email`, [id, body.status]);
      if (!rows[0]) return Response.json({ message: "Order not found." }, { status: 404 });
      const notificationAccepted = body.status === "Ready" ? await sendOrderEmail({ customerName: rows[0].customer_name, customerEmail: rows[0].customer_email, orderNumber: rows[0].order_number, status: "ready" }) : false;
      return Response.json({ order: rows[0], notificationAccepted });
    } catch { return Response.json({ message: "Could not update the order." }, { status: 503 }); }
  }
  return Response.json({ saved: true });
}

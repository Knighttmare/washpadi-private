import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";
import { listOrdersForUser, sendOrderEmail } from "@/lib/orders";

type NewOrder = {
  customerName?: unknown;
  customerEmail?: unknown;
  phone?: unknown;
  pickupAt?: unknown;
  pickupSlot?: unknown;
  isExpress?: unknown;
  careInstructions?: unknown;
  estimatedLow?: unknown;
  estimatedHigh?: unknown;
  paymentMethod?: unknown;
  items?: unknown;
};

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
    return Response.json({ orders: await listOrdersForUser(user) });
  } catch {
    return Response.json({ message: "Orders are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  let input: NewOrder;
  try { input = await request.json(); } catch { return Response.json({ message: "Send valid JSON." }, { status: 400 }); }

  const staff = user.role === "staff" || user.role === "owner";
  const customerName = staff && typeof input.customerName === "string" ? input.customerName.trim() : user.name.trim();
  const customerEmail = staff && typeof input.customerEmail === "string" ? input.customerEmail.trim().toLowerCase() : user.email.trim().toLowerCase();
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const paymentMethod = staff && input.paymentMethod === "Demo online" ? "Demo online" : "Pay on pickup";
  const pickupAt = typeof input.pickupAt === "string" && input.pickupAt ? new Date(input.pickupAt) : null;
  const items = Array.isArray(input.items) ? input.items.slice(0, 20) : [];
  if (!customerName || !customerEmail.includes("@") || !items.length || (pickupAt && Number.isNaN(pickupAt.getTime()))) {
    return Response.json({ message: "Enter a valid customer, pickup time, and at least one item." }, { status: 400 });
  }
  const normalizedItems = items.map((item) => {
    const row = item as Record<string, unknown>;
    const price = staff ? Number(row.price) : null;
    const careTags = Array.isArray(row.careTags) ? row.careTags.filter((tag): tag is string => typeof tag === "string").slice(0, 8) : [];
    return { name: typeof row.name === "string" ? row.name.trim() : "", category: typeof row.category === "string" ? row.category.trim() : "", quantity: Math.max(1, Math.min(99, Number(row.quantity) || 1)), service: typeof row.service === "string" ? row.service.trim() : "", careTags, price };
  });
  if (normalizedItems.some((item) => !item.name || !item.service || (staff && (!Number.isFinite(item.price) || Number(item.price) < 0 || Number(item.price) > 1_000_000)))) {
    return Response.json({ message: "Each item needs a name, service, and a valid staff-entered price." }, { status: 400 });
  }

  const pool = getDb();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: customers } = await client.query<{ id: string }>(
      `INSERT INTO customers (auth_user_id, name, email, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone,
         auth_user_id = COALESCE(customers.auth_user_id, EXCLUDED.auth_user_id)
       RETURNING id`,
      [staff ? null : user.id, customerName, customerEmail, phone],
    );
    const orderNumber = `WP-${Date.now().toString().slice(-8)}`;
    const isPriced = staff;
    const total = isPriced ? normalizedItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) : null;
    const paymentStatus = isPriced ? paymentMethod === "Demo online" ? "Paid (demo)" : "Due at pickup" : "Quote pending";
    const { rows: orderRows } = await client.query<{ id: string }>(
      `INSERT INTO orders (order_number, customer_id, created_by_user_id, pickup_at, payment_method, payment_status,
                           is_express, pickup_slot, care_instructions, estimated_low, estimated_high)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [orderNumber, customers[0].id, user.id, pickupAt, paymentMethod, paymentStatus,
       !staff && input.isExpress === true, typeof input.pickupSlot === "string" ? input.pickupSlot.slice(0, 60) : "",
       !staff && typeof input.careInstructions === "string" ? input.careInstructions.slice(0, 1000) : "",
       !staff && Number.isFinite(Number(input.estimatedLow)) ? Number(input.estimatedLow) : null,
       !staff && Number.isFinite(Number(input.estimatedHigh)) ? Number(input.estimatedHigh) : null],
    );
    for (const [index, item] of normalizedItems.entries()) {
      await client.query(
        `INSERT INTO order_items (order_id, tag, name, category, quantity, service, care_tags, price)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [orderRows[0].id, `${orderNumber}-${String(index + 1).padStart(2, "0")}`, item.name, item.category,
         item.quantity, item.service, JSON.stringify(item.careTags), item.price],
      );
    }
    if (isPriced) await client.query("INSERT INTO payments (order_id, amount, method, status, is_demo) VALUES ($1, $2, $3, $4, TRUE)",
      [orderRows[0].id, total, paymentMethod, paymentStatus]);
    await client.query("COMMIT");
    const notificationAccepted = await sendOrderEmail({ customerName, customerEmail, orderNumber, status: "received" });
    return Response.json({ id: orderRows[0].id, orderNumber, status: "Received", paymentStatus, notificationAccepted }, { status: 201 });
  } catch {
    await client.query("ROLLBACK").catch(() => undefined);
    return Response.json({ message: "Could not save the order. Check the database setup." }, { status: 503 });
  } finally {
    client.release();
  }
}

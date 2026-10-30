import { getCurrentAppUser } from "@/lib/roles";
import { getDb } from "@/lib/db";
import { sendReadyEmail } from "@/lib/orders";

type ReadyPayload = {
  orderNumber?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  if (user.role !== "staff" && user.role !== "owner") return Response.json({ message: "Staff access is required." }, { status: 403 });
  let payload: ReadyPayload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  const orderNumber = typeof payload.orderNumber === "string" ? payload.orderNumber.trim() : "";
  if (!orderNumber) return Response.json({ message: "An order number is required." }, { status: 400 });
  try {
    const { rows } = await getDb().query<{ customer_name: string; customer_email: string }>(
      `SELECT c.name AS customer_name, c.email AS customer_email
         FROM orders o JOIN customers c ON c.id = o.customer_id
        WHERE o.order_number = $1 AND o.status = 'Ready'`, [orderNumber],
    );
    if (!rows[0]) return Response.json({ message: "Ready order not found." }, { status: 404 });
    const sent = await sendReadyEmail({ customerName: rows[0].customer_name, customerEmail: rows[0].customer_email, orderNumber });
    return sent ? Response.json({ ok: true }) : Response.json({ message: "Order is ready, but Make could not send the email." }, { status: 502 });
  } catch {
    return Response.json({ message: "Could not check the order status." }, { status: 503 });
  }
}

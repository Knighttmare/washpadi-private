import { getDb } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/roles";

const allowedTags = new Set(["Stain Treatment", "Heavy Starch", "Delicate Fabric", "Hypo-allergenic"]);

async function getCustomer(user: { id: string; name: string; email: string }) {
  const { rows } = await getDb().query<{ id: string }>(
    `INSERT INTO customers (auth_user_id, name, email, phone)
     VALUES ($1, $2, $3, '')
     ON CONFLICT (email) DO UPDATE SET auth_user_id = COALESCE(customers.auth_user_id, EXCLUDED.auth_user_id)
     RETURNING id`, [user.id, user.name || user.email, user.email.trim().toLowerCase()],
  );
  return rows[0]?.id;
}

export async function GET() {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  try {
    if (user.role === "staff" || user.role === "owner") {
      const { rows } = await getDb().query(
        `SELECT l.id, l.tag, l.note, l.photo_data_url IS NOT NULL AS has_photo,
                l.created_at, c.name AS customer_name, c.email AS customer_email
           FROM customer_issue_logs l JOIN customers c ON c.id = l.customer_id
          ORDER BY l.created_at DESC LIMIT 100`,
      );
      return Response.json({ issues: rows });
    }
    const customerId = await getCustomer(user);
    const [preferences, issues] = await Promise.all([
      getDb().query("SELECT instructions, care_tags FROM customer_care_preferences WHERE customer_id = $1", [customerId]),
      getDb().query("SELECT id, tag, note, photo_data_url IS NOT NULL AS has_photo, created_at FROM customer_issue_logs WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20", [customerId]),
    ]);
    return Response.json({ preferences: preferences.rows[0] ?? { instructions: "", care_tags: [] }, issues: issues.rows });
  } catch { return Response.json({ message: "Could not load your care preferences." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  if (user.role !== "customer") return Response.json({ message: "Customer access is required." }, { status: 403 });
  let input: { instructions?: unknown; careTags?: unknown };
  try { input = await request.json(); } catch { return Response.json({ message: "Send valid JSON." }, { status: 400 }); }
  const instructions = typeof input.instructions === "string" ? input.instructions.trim().slice(0, 1000) : "";
  const careTags = Array.isArray(input.careTags) ? input.careTags.filter((tag): tag is string => typeof tag === "string" && allowedTags.has(tag)).slice(0, 4) : [];
  try {
    const customerId = await getCustomer(user);
    await getDb().query(
      `INSERT INTO customer_care_preferences (customer_id, instructions, care_tags)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (customer_id) DO UPDATE SET instructions = EXCLUDED.instructions,
         care_tags = EXCLUDED.care_tags, updated_at = NOW()`, [customerId, instructions, JSON.stringify(careTags)],
    );
    return Response.json({ saved: true });
  } catch { return Response.json({ message: "Could not save your care preferences." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getCurrentAppUser().catch(() => null);
  if (!user) return Response.json({ message: "Please sign in." }, { status: 401 });
  if (user.role !== "customer") return Response.json({ message: "Customer access is required." }, { status: 403 });
  let input: { tag?: unknown; note?: unknown; photoDataUrl?: unknown };
  try { input = await request.json(); } catch { return Response.json({ message: "Send valid JSON." }, { status: 400 }); }
  const tag = typeof input.tag === "string" ? input.tag.trim().slice(0, 60) : "";
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : "";
  const photo = typeof input.photoDataUrl === "string" ? input.photoDataUrl : "";
  if (!tag || !note || (photo && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) || photo.length > 2_100_000))) {
    return Response.json({ message: "Add a short note and tag. Photos must be PNG, JPG, or WebP under 1.5 MB." }, { status: 400 });
  }
  try {
    const customerId = await getCustomer(user);
    const { rows } = await getDb().query(
      `INSERT INTO customer_issue_logs (customer_id, tag, note, photo_data_url)
       VALUES ($1, $2, $3, $4) RETURNING id, tag, note, photo_data_url IS NOT NULL AS has_photo, created_at`,
      [customerId, tag, note, photo || null],
    );
    return Response.json({ issue: rows[0] }, { status: 201 });
  } catch { return Response.json({ message: "Could not save the garment issue note." }, { status: 503 }); }
}

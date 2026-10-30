import { getCurrentAppUser } from "@/lib/roles";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) return Response.json({ user: null });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    return Response.json({ message: "Authentication is not configured yet." }, { status: 503 });
  }
}

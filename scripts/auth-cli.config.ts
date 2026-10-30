import { getAuth } from "../src/lib/auth";

// Better Auth CLI entry point; keep the application auth instance lazy at runtime.
export const auth = getAuth();
export default auth;

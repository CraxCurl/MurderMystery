import { NextRequest } from "next/server";

function getAdminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  return password || null;
}

export function verifyAdminAuth(req: NextRequest): boolean {
  const adminPassword = getAdminPassword();
  // Admin access must never silently fall back to a repository default.
  if (!adminPassword) return false;

  const authHeader = req.headers.get("authorization");
  const passwordHeader = req.headers.get("x-admin-password");

  if (passwordHeader && passwordHeader === adminPassword) {
    return true;
  }

  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    if (token === adminPassword) {
      return true;
    }
  }

  return false;
}

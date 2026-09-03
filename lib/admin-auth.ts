import { NextRequest } from "next/server";

export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export function verifyAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const passwordHeader = req.headers.get("x-admin-password");

  if (passwordHeader && passwordHeader === DEFAULT_ADMIN_PASSWORD) {
    return true;
  }

  if (authHeader) {
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    if (token === DEFAULT_ADMIN_PASSWORD) {
      return true;
    }
  }

  return false;
}

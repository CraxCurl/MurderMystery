import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "aimurdle_squad_session";

export interface SquadSessionData {
  teamName: string;
  teamToken: string;
  squadBadge: string;
  caseId: string;
}

/**
 * Encode session data into base64 string for cookie
 */
export function encodeSession(data: SquadSessionData): string {
  const jsonStr = JSON.stringify(data);
  return Buffer.from(jsonStr, "utf-8").toString("base64");
}

/**
 * Decode session data from cookie string
 */
export function decodeSession(cookieValue: string | undefined | null): SquadSessionData | null {
  if (!cookieValue) return null;
  try {
    const jsonStr = Buffer.from(cookieValue, "base64").toString("utf-8");
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.teamName && parsed.teamToken) {
      return parsed as SquadSessionData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get session from request cookies or headers
 */
export function getSquadSessionFromReq(req: NextRequest): SquadSessionData | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie) {
    const data = decodeSession(cookie);
    if (data) return data;
  }

  // Fallback to headers
  const headerName = req.headers.get("x-team-name");
  const headerToken = req.headers.get("x-team-token");
  const headerBadge = req.headers.get("x-squad-badge") || "search";

  if (headerName && headerToken) {
    return {
      teamName: headerName,
      teamToken: headerToken,
      squadBadge: headerBadge,
      caseId: "ghost-in-the-model",
    };
  }

  return null;
}

/**
 * Set session cookie on response
 */
export function setSquadSessionCookie(res: NextResponse, data: SquadSessionData) {
  const encoded = encodeSession(data);
  res.cookies.set(SESSION_COOKIE_NAME, encoded, {
    httpOnly: false, // Accessible client-side & server-side for Next.js
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clear session cookie
 */
export function clearSquadSessionCookie(res: NextResponse) {
  res.cookies.delete(SESSION_COOKIE_NAME);
}

import { NextResponse } from "next/server";
import { AUTH_COOKIE, GUEST_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  res.cookies.delete(GUEST_COOKIE);
  return res;
}

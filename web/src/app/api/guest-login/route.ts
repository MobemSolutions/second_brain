import { NextResponse } from "next/server";
import { GUEST_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GUEST_COOKIE, "1", {
    httpOnly: false, // not a secret — just a mode flag the sidebar reads client-side
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

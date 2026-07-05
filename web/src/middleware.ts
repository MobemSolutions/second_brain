import { NextRequest, NextResponse } from "next/server";
import { authToken, AUTH_COOKIE, GUEST_COOKIE } from "@/lib/auth";

const GUEST_BLOCKED_PREFIXES = ["/psy", "/api/psy"];

function isGuestBlocked(pathname: string): boolean {
  return GUEST_BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return new NextResponse("SITE_PASSWORD n'est pas configuré", { status: 500 });
  }

  const authCookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (authCookie === (await authToken(expected))) {
    // Owner: full access. Strip any client-supplied x-sb-scope so a
    // forged header can never make an owner request look like a guest one.
    const headers = new Headers(req.headers);
    headers.delete("x-sb-scope");
    return NextResponse.next({ request: { headers } });
  }

  const guestCookie = req.cookies.get(GUEST_COOKIE)?.value;
  if (guestCookie === "1") {
    if (isGuestBlocked(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Guest: scoped access. Route handlers read this header (never the
    // cookie directly) to decide which set of tables to query — this is
    // the single place that decision gets made.
    const headers = new Headers(req.headers);
    headers.set("x-sb-scope", "guest");
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/((?!login|api/login|api/guest-login|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.json|logo.jpg).*)",
  ],
};

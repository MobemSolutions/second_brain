import { NextRequest, NextResponse } from "next/server";
import { authToken, AUTH_COOKIE } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return new NextResponse("SITE_PASSWORD n'est pas configuré", { status: 500 });
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === (await authToken(expected))) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.json|logo.jpg).*)",
  ],
};

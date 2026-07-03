import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const expected = process.env.SITE_PASSWORD;
  const auth = req.headers.get("authorization");

  if (expected && auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString();
    const password = decoded.split(":")[1] ?? "";
    if (password === expected) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentification requise", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Second Brain"' },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.json|logo.jpg).*)",
  ],
};

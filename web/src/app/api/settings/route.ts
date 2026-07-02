import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const key = req.nextUrl.searchParams.get("key");
  if (key) {
    const row = await db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
    return NextResponse.json({ value: row?.value ?? null });
  }
  const rows = await db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return NextResponse.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json() as { key: string; value: string };
  await db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(body.key, body.value ?? "");
  return NextResponse.json({ ok: true });
}

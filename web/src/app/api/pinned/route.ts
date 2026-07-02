import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const row = await db.prepare("SELECT pdf_path FROM pinned_files WHERE key = ?").get(key) as { pdf_path: string } | undefined;
  return NextResponse.json({ pdf_path: row?.pdf_path ?? null });
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json() as { key: string; pdf_path: string | null };
  if (!body.key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  await db.prepare(
    `INSERT INTO pinned_files (key, pdf_path, updated_at) VALUES (?, ?, datetime('now','localtime'))
     ON CONFLICT(key) DO UPDATE SET pdf_path = excluded.pdf_path, updated_at = excluded.updated_at`
  ).run(body.key, body.pdf_path ?? null);

  return NextResponse.json({ ok: true });
}

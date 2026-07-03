import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.includes("pdf"))
    return NextResponse.json({ error: "PDF uniquement" }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const db = await getDb();
  await db
    .prepare("INSERT INTO files (filename, mime_type, data) VALUES (?, ?, ?)")
    .run(filename, file.type || "application/pdf", bytes);

  return NextResponse.json({ filename });
}

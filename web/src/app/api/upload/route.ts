import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.includes("pdf"))
    return NextResponse.json({ error: "PDF uniquement" }, { status: 400 });

  const dataDir = process.env.DB_PATH
    ? path.dirname(process.env.DB_PATH)
    : path.join(process.cwd(), "data");

  const attachDir = path.join(dataDir, "attachments");
  mkdirSync(attachDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(path.join(attachDir, filename), buffer);

  return NextResponse.json({ filename });
}

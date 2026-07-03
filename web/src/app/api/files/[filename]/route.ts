import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\"))
    return new NextResponse("Forbidden", { status: 403 });

  const db = await getDb();
  const row = await db.prepare("SELECT mime_type, data FROM files WHERE filename = ?").get(filename) as
    | { mime_type: string; data: ArrayBuffer }
    | undefined;

  if (!row) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(row.data), {
    headers: {
      "Content-Type": row.mime_type || "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

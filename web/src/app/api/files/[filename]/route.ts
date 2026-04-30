import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\"))
    return new NextResponse("Forbidden", { status: 403 });

  const dataDir = process.env.DB_PATH
    ? path.dirname(process.env.DB_PATH)
    : path.join(process.cwd(), "data");

  const filePath = path.join(dataDir, "attachments", filename);
  if (!existsSync(filePath)) return new NextResponse("Not found", { status: 404 });

  const file = readFileSync(filePath);
  return new NextResponse(file, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

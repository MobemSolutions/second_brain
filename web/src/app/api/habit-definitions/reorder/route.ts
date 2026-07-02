import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const db = await getDb();
  const b = await req.json() as { ids: number[] };

  const update = db.prepare("UPDATE habit_definitions SET ordre = ? WHERE id = ?");
  for (const [index, id] of b.ids.entries()) await update.run(index, id);

  return NextResponse.json({ ok: true });
}

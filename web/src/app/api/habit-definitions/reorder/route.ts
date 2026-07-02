import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const db = getDb();
  const b = await req.json() as { ids: number[] };

  const update = db.prepare("UPDATE habit_definitions SET ordre = ? WHERE id = ?");
  b.ids.forEach((id, index) => update.run(index, id));

  return NextResponse.json({ ok: true });
}

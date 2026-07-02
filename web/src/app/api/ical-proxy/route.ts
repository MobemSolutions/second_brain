import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface IcalEvent {
  date: string;
  title: string;
  endDate?: string;
  description?: string;
}

function parseIcalDate(value: string): string | null {
  // DATE only: 20260501
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;

  // DATETIME: 20260501T140000Z or 20260501T140000
  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (dateTime) return `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`;

  return null;
}

function extractPropValue(line: string): string {
  const colonIdx = line.indexOf(":");
  return colonIdx >= 0 ? line.slice(colonIdx + 1).trim() : "";
}

function parseIcal(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // Unfold continued lines (lines starting with space/tab are continuations)
  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  let inEvent = false;
  let current: Partial<IcalEvent> = {};

  for (const line of unfolded) {
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (upper === "END:VEVENT") {
      inEvent = false;
      if (current.date && current.title) {
        events.push(current as IcalEvent);
      }
      continue;
    }
    if (!inEvent) continue;

    const propName = line.split(":")[0].split(";")[0].toUpperCase();
    const value = extractPropValue(line);

    if (propName === "SUMMARY") {
      current.title = value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";");
    } else if (propName === "DTSTART") {
      const rawValue = line.includes(":") ? line.split(":").slice(1).join(":") : value;
      current.date = parseIcalDate(rawValue.split("T")[0].replace(/-/g, "")) ?? parseIcalDate(rawValue) ?? rawValue.slice(0, 10);
    } else if (propName === "DTEND") {
      const rawValue = line.includes(":") ? line.split(":").slice(1).join(":") : value;
      current.endDate = parseIcalDate(rawValue.split("T")[0].replace(/-/g, "")) ?? undefined;
    } else if (propName === "DESCRIPTION") {
      current.description = value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
    }
  }

  return events;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) return NextResponse.json([]);

  // webcal:// is just an alias for https:// on real ical feeds (e.g. Apple Calendar share links)
  const url = rawUrl.replace(/^webcal:\/\//i, "https://");

  // Basic URL validation — only allow http/https
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json([]);
    }
  } catch {
    return NextResponse.json([]);
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SecondBrain/1.0", "Accept": "text/calendar" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const text = await response.text();
    const events = parseIcal(text);

    return NextResponse.json(events);
  } catch {
    return NextResponse.json([]);
  }
}

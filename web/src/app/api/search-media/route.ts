import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SearchResult {
  titre: string;
  createur: string;
  genre: string;
  description: string;
  casting: string;
  cover: string | null;
  annee?: string;
}

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

async function searchTmdb(query: string, mediaType: "movie" | "tv"): Promise<SearchResult[]> {
  const apiKey = await getSetting("tmdb_key");
  if (!apiKey) return [];

  const endpoint = `https://api.themoviedb.org/3/search/${mediaType}?query=${encodeURIComponent(query)}&api_key=${apiKey}&language=fr-FR&page=1`;
  const r = await fetch(endpoint);
  if (!r.ok) return [];
  const data = await r.json() as { results?: Record<string, unknown>[] };

  return (data.results ?? []).slice(0, 8).map((d) => {
    const genreIds = Array.isArray(d.genre_ids) ? (d.genre_ids as number[]) : [];
    const title = (mediaType === "movie" ? d.title : d.name) as string ?? "";
    const date = (mediaType === "movie" ? d.release_date : d.first_air_date) as string ?? "";
    const poster = d.poster_path ? `https://image.tmdb.org/t/p/w200${d.poster_path}` : null;
    return {
      titre: title,
      createur: "",
      genre: genreIds.join(", "),
      description: ((d.overview as string) ?? "").slice(0, 300),
      casting: "",
      cover: poster,
      annee: date ? date.slice(0, 4) : "",
    };
  });
}

async function searchRawg(query: string): Promise<SearchResult[]> {
  const apiKey = await getSetting("rawg_key");
  if (!apiKey) return [];

  const r = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=8`);
  if (!r.ok) return [];
  const data = await r.json() as { results?: Record<string, unknown>[] };

  return (data.results ?? []).slice(0, 8).map((d) => ({
    titre: d.name as string ?? "",
    createur: Array.isArray(d.developers) ? (d.developers as Array<{ name: string }>).map((dev) => dev.name).join(", ") : "",
    genre: Array.isArray(d.genres) ? (d.genres as Array<{ name: string }>).map((g) => g.name).join(", ") : "",
    description: "",
    casting: "",
    cover: (d.background_image as string) ?? null,
    annee: d.released ? (d.released as string).slice(0, 4) : "",
  }));
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim() || q.length < 2) return NextResponse.json([]);

  try {
    let results: SearchResult[] = [];
    if (type === "film")  results = await searchTmdb(q, "movie");
    if (type === "serie") results = await searchTmdb(q, "tv");
    if (type === "jeu")   results = await searchRawg(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}

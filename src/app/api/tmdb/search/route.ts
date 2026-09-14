import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchTitles } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  try {
    const results = await searchTitles(query);
    return NextResponse.json({ results: results.slice(0, 8) });
  } catch {
    return NextResponse.json({ error: "TMDB search failed" }, { status: 502 });
  }
}

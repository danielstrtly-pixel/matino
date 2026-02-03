import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SCRAPER_URL = process.env.SCRAPER_URL || "http://localhost:3001";
const SYNC_API_KEY = process.env.SYNC_API_KEY || "sm-sync-k8x2pqR7vN4mW3jL";

/**
 * POST: Sync all of user's stores that haven't been synced today.
 * Proxies to scraper /api/sync with proper authentication.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Sync] User ${user.id} triggered sync via API`);

    // Call scraper API with API key auth
    const scraperRes = await fetch(`${SCRAPER_URL}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": SYNC_API_KEY,
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!scraperRes.ok) {
      const error = await scraperRes.text();
      console.error("[Sync] Scraper error:", error);
      return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }

    const result = await scraperRes.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in POST /api/stores/sync-user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

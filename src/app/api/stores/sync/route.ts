import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SCRAPER_URL = process.env.SCRAPER_URL || "http://localhost:3001";
const SYNC_COOLDOWN_HOURS = 24;

interface Store {
  id: string;
  name: string;
  chain_id: string;
  external_id: string;
  offers_url: string | null;
  last_synced_at: string | null;
}

interface Offer {
  id: string;
  name: string;
  brand?: string;
  offerPrice: number;
  originalPrice?: number;
  quantity?: number;
  quantityPrice?: number;
  unit?: string;
  imageUrl?: string;
  storeId: string;
  chain: string;
  requiresMembership?: boolean;
  scrapedAt: string;
}

// POST: Sync offers for specified stores
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeIds, force = false } = await request.json();

    if (!Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json({ error: "storeIds must be a non-empty array" }, { status: 400 });
    }

    // Get store details
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, name, chain_id, external_id, offers_url, last_synced_at")
      .in("id", storeIds);

    if (storesError || !stores) {
      console.error("Error fetching stores:", storesError);
      return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
    }

    const results: { storeId: string; status: string; offers?: number; error?: string }[] = [];
    const now = new Date();
    const cooldownMs = SYNC_COOLDOWN_HOURS * 60 * 60 * 1000;

    for (const store of stores as Store[]) {
      // Check cooldown (skip if synced within 24h, unless forced)
      if (!force && store.last_synced_at) {
        const lastSync = new Date(store.last_synced_at);
        if (now.getTime() - lastSync.getTime() < cooldownMs) {
          results.push({ 
            storeId: store.id, 
            status: "skipped", 
            error: `Synced ${Math.round((now.getTime() - lastSync.getTime()) / 3600000)}h ago` 
          });
          continue;
        }
      }

      try {
        // Call scraper
        const scraperPayload = {
          id: store.id,
          name: store.name,
          chain: store.chain_id,
          externalId: store.external_id,
          offersUrl: store.offers_url,
        };

        console.log(`[Sync] Scraping ${store.name}...`);
        const scraperRes = await fetch(`${SCRAPER_URL}/chains/${store.chain_id}/offers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scraperPayload),
        });

        if (!scraperRes.ok) {
          throw new Error(`Scraper returned ${scraperRes.status}`);
        }

        const scraperData = await scraperRes.json();
        const offers: Offer[] = scraperData.offers || [];

        // Delete old offers for this store
        await supabase.from("offers").delete().eq("store_id", store.id);

        // Insert new offers
        if (offers.length > 0) {
          const offersToInsert = offers.map((o) => ({
            id: o.id,
            store_id: o.storeId,
            chain_id: o.chain,
            name: o.name,
            brand: o.brand || null,
            offer_price: o.offerPrice,
            original_price: o.originalPrice || null,
            quantity: o.quantity || null,
            quantity_price: o.quantityPrice || null,
            unit: o.unit || null,
            image_url: o.imageUrl || null,
            requires_membership: o.requiresMembership || false,
            scraped_at: o.scrapedAt,
          }));

          const { error: insertError } = await supabase
            .from("offers")
            .upsert(offersToInsert, { onConflict: "id" });

          if (insertError) {
            console.error(`[Sync] Error inserting offers for ${store.name}:`, insertError);
          }
        }

        // Update last_synced_at
        await supabase
          .from("stores")
          .update({ last_synced_at: now.toISOString() })
          .eq("id", store.id);

        results.push({ storeId: store.id, status: "synced", offers: offers.length });
        console.log(`[Sync] ${store.name}: ${offers.length} offers`);
      } catch (err) {
        console.error(`[Sync] Error syncing ${store.name}:`, err);
        results.push({ 
          storeId: store.id, 
          status: "error", 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      totalSynced: results.filter(r => r.status === "synced").reduce((sum, r) => sum + (r.offers || 0), 0),
    });
  } catch (error) {
    console.error("Error in POST /api/stores/sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

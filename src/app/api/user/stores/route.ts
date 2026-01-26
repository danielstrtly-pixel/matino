import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Load user's selected stores
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's selected stores with store details
    const { data: userStores, error } = await supabase
      .from("user_stores")
      .select(`
        store_id,
        stores (
          id,
          name,
          address,
          city,
          chain_id,
          external_id,
          profile
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading user stores:", error);
      return NextResponse.json({ error: "Failed to load stores" }, { status: 500 });
    }

    // Map to frontend format
    const stores = (userStores || [])
      .filter((us: any) => us.stores)
      .map((us: any) => ({
        id: us.stores.id,
        name: us.stores.name,
        address: us.stores.address,
        city: us.stores.city,
        chain: us.stores.chain_id,
        externalId: us.stores.external_id,
        profile: us.stores.profile,
      }));

    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Error in GET /api/user/stores:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Save user's selected stores
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeIds } = await request.json();

    if (!Array.isArray(storeIds)) {
      return NextResponse.json({ error: "storeIds must be an array" }, { status: 400 });
    }

    // Delete existing selections
    const { error: deleteError } = await supabase
      .from("user_stores")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting old stores:", deleteError);
      return NextResponse.json({ error: "Failed to update stores" }, { status: 500 });
    }

    // Insert new selections
    if (storeIds.length > 0) {
      const { error: insertError } = await supabase
        .from("user_stores")
        .insert(
          storeIds.map((storeId: string) => ({
            user_id: user.id,
            store_id: storeId,
          }))
        );

      if (insertError) {
        console.error("Error inserting stores:", insertError);
        return NextResponse.json({ error: "Failed to save stores" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: storeIds.length });
  } catch (error) {
    console.error("Error in POST /api/user/stores:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

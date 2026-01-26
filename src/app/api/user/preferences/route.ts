import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Load user preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prefs, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (not an error, just no prefs yet)
      console.error("Error loading preferences:", error);
      return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
    }

    // Return default values if no preferences exist
    return NextResponse.json({
      householdSize: prefs?.household_size || 2,
      likes: prefs?.likes || [],
      dislikes: prefs?.dislikes || [],
      allergies: prefs?.allergies || [],
    });
  } catch (error) {
    console.error("Error in GET /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Save user preferences
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { householdSize, likes, dislikes, allergies } = await request.json();

    // Upsert preferences
    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        household_size: householdSize || 2,
        likes: likes || [],
        dislikes: dislikes || [],
        allergies: allergies || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Error saving preferences:", error);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

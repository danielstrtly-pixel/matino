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
      hasChildren: prefs?.has_children || false,
      likes: prefs?.likes || [],
      dislikes: prefs?.dislikes || [],
      allergies: prefs?.allergies || [],
      healthLabels: prefs?.health_labels || [],
      dietLabels: prefs?.diet_labels || [],
      cuisineTypes: prefs?.cuisine_types || [],
      mealsPerWeek: prefs?.meals_per_week || 5,
      maxCookTime: prefs?.max_cook_time || 45,
      includeLunch: prefs?.include_lunch || false,
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

    const { 
      householdSize, 
      hasChildren,
      likes, 
      dislikes, 
      allergies,
      healthLabels,
      dietLabels,
      cuisineTypes,
      mealsPerWeek,
      maxCookTime,
      includeLunch,
    } = await request.json();

    // Upsert preferences
    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        household_size: householdSize || 2,
        has_children: hasChildren || false,
        likes: likes || [],
        dislikes: dislikes || [],
        allergies: allergies || [],
        health_labels: healthLabels || [],
        diet_labels: dietLabels || [],
        cuisine_types: cuisineTypes || [],
        meals_per_week: mealsPerWeek || 5,
        max_cook_time: maxCookTime || 45,
        include_lunch: includeLunch || false,
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

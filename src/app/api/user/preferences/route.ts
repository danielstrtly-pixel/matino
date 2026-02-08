import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Load user preferences (primarily interview profile)
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

    // Return preferences - interview profile is the main source now
    return NextResponse.json({
      // User info
      email: user.email || null,

      // Core preferences from interview
      interviewProfile: prefs?.interview_profile || null,
      
      // Legacy fields (for backward compatibility with menu generator)
      householdSize: prefs?.household_size || prefs?.interview_profile?.householdSize || 2,
      hasChildren: prefs?.has_children || false,
      likes: prefs?.likes || [],
      dislikes: prefs?.dislikes || [],
      healthLabels: prefs?.health_labels || [],
      dietLabels: prefs?.diet_labels || [],
      cuisineTypes: prefs?.cuisine_types || [],
      mealsPerWeek: prefs?.meals_per_week || 7,
      maxCookTime: prefs?.max_cook_time || 45,
    });
  } catch (error) {
    console.error("Error in GET /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

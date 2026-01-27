import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Load user feedback
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: feedback, error } = await supabase
      .from("user_feedback")
      .select("recipe_name, reason, preference, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading feedback:", error);
      return NextResponse.json({ feedback: [] });
    }

    return NextResponse.json({ feedback: feedback || [] });
  } catch (error) {
    console.error("Error in GET /api/user/feedback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Clear all feedback
export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_feedback")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting feedback:", error);
      return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/user/feedback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List saved recipes
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let query = supabase
      .from("saved_recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching recipes:", error);
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
    }

    return NextResponse.json({ recipes: data || [] });
  } catch (error) {
    console.error("Error in GET /api/recipes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Save a recipe
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, url, description, source, imageUrl } = await request.json();

    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("saved_recipes")
      .upsert({
        user_id: user.id,
        title,
        url,
        description,
        source,
        image_url: imageUrl,
      }, {
        onConflict: "user_id,url",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving recipe:", error);
      return NextResponse.json({ error: "Failed to save recipe" }, { status: 500 });
    }

    return NextResponse.json({ recipe: data });
  } catch (error) {
    console.error("Error in POST /api/recipes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a saved recipe
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", user.id)
      .eq("url", url);

    if (error) {
      console.error("Error deleting recipe:", error);
      return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/recipes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

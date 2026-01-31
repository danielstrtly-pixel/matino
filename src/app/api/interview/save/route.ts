import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { profile } = await request.json();

    if (!profile) {
      return NextResponse.json({ error: 'Profile required' }, { status: 400 });
    }

    // Save to user_preferences using admin client (bypasses RLS for upsert)
    const admin = getSupabaseAdmin();
    
    const { error } = await admin
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        household_size: profile.householdSize || 2,
        likes: profile.currentHabits ? [profile.currentHabits] : [],
        dislikes: profile.restrictions || [],
        allergies: profile.restrictions || [],
        interview_profile: profile,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Save profile error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save interview error:', error);
    return NextResponse.json(
      { error: 'Failed to save interview' },
      { status: 500 }
    );
  }
}

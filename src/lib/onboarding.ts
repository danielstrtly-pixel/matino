import { createClient } from "@/lib/supabase/server";

export async function checkOnboardingStatus(userId: string) {
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("interview_profile")
    .eq("user_id", userId)
    .maybeSingle();

  const hasProfile = !!prefs?.interview_profile;

  return {
    hasProfile,
    needsOnboarding: !hasProfile,
  };
}

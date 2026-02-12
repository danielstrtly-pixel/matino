import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkOnboardingStatus } from "@/lib/onboarding";
import WelcomeClient from "./WelcomeClient";

export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { needsOnboarding } = await checkOnboardingStatus(user.id);

  if (!needsOnboarding) {
    redirect("/dashboard/menu");
  }

  return <WelcomeClient />;
}

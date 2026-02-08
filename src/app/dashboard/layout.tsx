import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { TrialBanner } from "@/components/TrialBanner";
import { checkAccess } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const access = await checkAccess(user);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <NavBar variant="dashboard" />

      {access.isTrialing && access.trialDaysLeft !== null && (
        <TrialBanner daysLeft={access.trialDaysLeft} />
      )}

      <main className="flex-1 pb-8">{children}</main>

      <Footer />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-bold text-green-800">Matino</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Översikt
            </Link>
            <Link href="/dashboard/stores" className="text-gray-600 hover:text-gray-900">
              Butiker
            </Link>
            <Link href="/dashboard/deals" className="text-gray-600 hover:text-gray-900">
              Erbjudanden
            </Link>
            <Link href="/dashboard/menu" className="text-gray-600 hover:text-gray-900">
              Veckomeny
            </Link>
            <Link href="/dashboard/shopping-list" className="text-gray-600 hover:text-gray-900">
              Inköpslista
            </Link>
            <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">
              Inställningar
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

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

  const navItems = [
    { href: "/dashboard", label: "Översikt", icon: "🏠" },
    { href: "/dashboard/stores", label: "Butiker", icon: "🏪" },
    { href: "/dashboard/deals", label: "Erbjudanden", icon: "🏷️" },
    { href: "/dashboard/menu", label: "Veckomeny", icon: "🍽️" },
    { href: "/dashboard/shopping-list", label: "Inköpslista", icon: "📝" },
    { href: "/dashboard/settings", label: "Inställningar", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Top Navigation */}
      <nav className="bg-cream-light border-b border-cream-dark sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
          </Link>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className="text-charcoal/70 hover:text-charcoal transition-colors flex items-center gap-1.5"
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <span className="text-cream-dark">|</span>
            <LogoutButton />
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <LogoutButton />
          </div>
        </div>
        
        {/* Mobile nav */}
        <div className="md:hidden overflow-x-auto border-t border-cream-dark">
          <div className="flex px-4 py-2 gap-4">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className="text-charcoal/70 hover:text-charcoal transition-colors flex items-center gap-1 whitespace-nowrap text-sm py-1"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
      
      <main className="pb-8">{children}</main>
    </div>
  );
}

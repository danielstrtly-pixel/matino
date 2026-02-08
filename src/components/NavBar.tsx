import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileMenu } from "@/components/MobileMenu";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const dashboardNavItems: NavItem[] = [
  { href: "/dashboard", label: "Översikt", icon: "🏠" },
  { href: "/dashboard/stores", label: "Butiker", icon: "🏪" },
  { href: "/dashboard/deals", label: "Erbjudanden", icon: "🏷️" },
  { href: "/dashboard/menu", label: "Veckomeny", icon: "🍽️" },
  { href: "/dashboard/recipes", label: "Receptsamling", icon: "❤️" },
  { href: "/dashboard/settings", label: "Inställningar", icon: "⚙️" },
];

const marketingNavLinks = [
  { href: "#how", label: "Hur det funkar" },
  { href: "#pricing", label: "Priser" },
  { href: "#faq", label: "FAQ" },
];

interface NavBarProps {
  variant: "marketing" | "dashboard";
  isLoggedIn?: boolean;
}

export function NavBar({ variant, isLoggedIn = false }: NavBarProps) {
  if (variant === "dashboard" || (variant === "marketing" && isLoggedIn)) {
    return (
      <nav className="bg-cream-light border-b border-cream-dark sticky top-0 z-50" aria-label="Huvudnavigering">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {dashboardNavItems.map((item) => (
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
          <MobileMenu variant="dashboard" items={dashboardNavItems} />
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-cream-light/80 backdrop-blur-sm border-b border-cream-dark/50 sticky top-0 z-50" aria-label="Huvudnavigering">
      <div className="container mx-auto px-4 py-4 md:py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {marketingNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-charcoal/70 hover:text-charcoal transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-charcoal/70 hover:text-charcoal transition-colors hidden sm:block text-sm"
          >
            Logga in
          </Link>
          <Button asChild className="bg-orange hover:bg-orange-hover text-white rounded-full px-5 md:px-6">
            <Link href="/signup">Prova gratis</Link>
          </Button>
          <MobileMenu variant="marketing" links={marketingNavLinks} />
        </div>
      </div>
    </nav>
  );
}

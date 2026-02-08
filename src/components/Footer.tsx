import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-charcoal text-white py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥗</span>
            <span className="font-serif font-bold text-lg">SmartaMenyn</span>
          </div>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Integritetspolicy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Användarvillkor
            </Link>
          </div>
          <p className="text-white/50 text-sm">
            © 2026 SmartaMenyn · Gjord i Stockholm 🇸🇪
          </p>
        </div>
      </div>
    </footer>
  );
}

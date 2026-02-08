import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { PainSection } from "@/components/landing/PainSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductDemo } from "@/components/landing/ProductDemo";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { PricingSection } from "@/components/PricingSection";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SmartaMenyn – Veckomeny baserad på veckans erbjudanden | Spara tid & pengar på maten",
  description: "Slipp frågan 'vad ska vi äta?' för alltid. SmartaMenyn skapar personliga veckomenyer baserade på erbjudanden från ICA, Coop, Hemköp och Lidl. Spara 800-1200 kr/mån.",
  keywords: "veckomeny, matplanering, veckans erbjudanden, spara pengar mat, inköpslista, recept budget, måltidsplanering",
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-cream">
      <NavBar variant="marketing" isLoggedIn={isLoggedIn} />

      <HeroSection isLoggedIn={isLoggedIn} />

      {/* Stores Strip */}
      <RevealOnScroll>
        <section className="bg-white border-y border-cream-dark py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
              <span className="text-sm text-charcoal/50 font-medium">Erbjudanden från</span>
              {[
                { name: "ICA", color: "text-[#E3000B]" },
                { name: "Coop", color: "text-[#00A94F]" },
                { name: "Hemköp", color: "text-[#E85C0D]" },
                { name: "Lidl", color: "text-[#0050AA]" },
              ].map((store) => (
                <span
                  key={store.name}
                  className={`${store.color} font-bold text-sm border border-current/20 rounded-full px-4 py-1.5 hover:shadow-md hover:-translate-y-0.5 transition-all`}
                >
                  {store.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <PainSection />

      <HowItWorks />

      <ProductDemo />

      <FeaturesSection />

      {/* Trust Signals */}
      <RevealOnScroll>
        <section className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
              <div>
                <span className="text-3xl mb-3 block">🔒</span>
                <h3 className="font-serif font-semibold text-charcoal mb-2">Avsluta när du vill</h3>
                <p className="text-sm text-charcoal/60">Ingen bindningstid, inga dolda avgifter</p>
              </div>
              <div>
                <span className="text-3xl mb-3 block">💳</span>
                <h3 className="font-serif font-semibold text-charcoal mb-2">Inget betalkort krävs</h3>
                <p className="text-sm text-charcoal/60">7 dagars gratis test utan förpliktelser</p>
              </div>
              <div>
                <span className="text-3xl mb-3 block">🇸🇪</span>
                <h3 className="font-serif font-semibold text-charcoal mb-2">Byggt i Sverige</h3>
                <p className="text-sm text-charcoal/60">Utvecklat i Stockholm för svenska familjer</p>
              </div>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <FaqSection />

      <PricingSection isLoggedIn={isLoggedIn} />

      {/* Final CTA */}
      <section className="bg-orange py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-white mb-4">
            Redo att slippa matplaneringen?
          </h2>
          <p className="text-white/80 mb-8 max-w-lg mx-auto">
            Testa SmartaMenyn gratis i 7 dagar. Om du inte sparar tid och pengar –
            avsluta när du vill, helt utan kostnad.
          </p>
          {!isLoggedIn && (
            <>
              <Button
                asChild
                size="lg"
                className="bg-white text-orange hover:bg-cream-light rounded-full px-10 py-6 text-lg font-semibold shadow-lg"
              >
                <Link href="/signup">Kom igång gratis →</Link>
              </Button>
              <p className="text-white/60 text-sm mt-4">Inget betalkort krävs</p>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

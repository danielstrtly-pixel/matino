import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./RevealOnScroll";

interface HeroSectionProps {
  isLoggedIn: boolean;
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <section className="container mx-auto px-4 pt-8 md:pt-16 pb-16 md:pb-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
        {/* Left column - text */}
        <div className="text-center lg:text-left">
          <RevealOnScroll>
            <div className="inline-flex items-center bg-orange/10 text-orange rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              För dig som är trött på att planera veckans mat
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.05}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-charcoal mb-6 leading-tight">
              Slipp &quot;vad ska vi äta?&quot;{" "}
              <span className="text-fresh italic">varje dag, för alltid</span>
            </h1>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1}>
            <p className="text-lg md:text-xl text-charcoal/70 mb-8 leading-relaxed">
              SmartaMenyn skapar din veckomeny automatiskt – baserad på veckans
              bästa erbjudanden från butikerna du faktiskt handlar i. Du sparar
              tid, pengar och slipper huvudvärken.
            </p>
          </RevealOnScroll>

          {!isLoggedIn && (
            <RevealOnScroll delay={0.15}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-orange hover:bg-orange-hover text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                >
                  <Link href="/signup">Prova gratis i 7 dagar →</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 py-6 text-lg border-charcoal/20 hover:bg-cream-dark"
                >
                  <Link href="#how">▶ Se hur det funkar</Link>
                </Button>
              </div>
              <p className="text-sm text-charcoal/50">
                Inget betalkort krävs · Avsluta när du vill
              </p>
            </RevealOnScroll>
          )}

          <RevealOnScroll delay={0.2}>
            <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-cream-dark">
              <div className="text-center lg:text-left">
                <div className="text-2xl md:text-3xl font-bold text-charcoal">2–3h</div>
                <div className="text-xs md:text-sm text-charcoal/60">sparad tid per vecka</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl md:text-3xl font-bold text-charcoal">800kr</div>
                <div className="text-xs md:text-sm text-charcoal/60">lägre matkostnad/mån</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl md:text-3xl font-bold text-charcoal">0st</div>
                <div className="text-xs md:text-sm text-charcoal/60">&quot;vad ska vi äta?&quot;</div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        {/* Right column - placeholder for phone mockup */}
        <RevealOnScroll delay={0.15} className="hidden lg:block">
          <div className="bg-cream-light border-2 border-cream-dark rounded-3xl p-8 aspect-[3/4] flex flex-col items-center justify-center text-center">
            <span className="text-6xl mb-4">🥗</span>
            <p className="text-lg font-serif font-semibold text-charcoal mb-2">
              Veckomeny-preview
            </p>
            <p className="text-sm text-charcoal/50">
              Interaktiv förhandsvisning kommer snart
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

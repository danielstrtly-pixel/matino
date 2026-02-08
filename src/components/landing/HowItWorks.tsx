import { Card, CardContent } from "@/components/ui/card";
import { RevealOnScroll } from "./RevealOnScroll";

const steps = [
  {
    num: "1",
    icon: "🏪",
    title: "Välj dina butiker",
    desc: "Markera vilka butiker du brukar handla i. Vi stödjer ICA, Coop, Hemköp och Lidl – de stora kedjorna där du redan handlar.",
  },
  {
    num: "2",
    icon: "🤖",
    title: "AI skapar din veckomeny",
    desc: "Varje vecka analyserar vi tusentals erbjudanden och skapar en komplett veckomeny med recept som passar din familj och budget.",
  },
  {
    num: "3",
    icon: "📋",
    title: "Handla med din smarta lista",
    desc: "Få en inköpslista sorterad per butik. Du vet exakt vad du ska köpa, var du köper det, och vad det kostar.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center mb-12 md:mb-16">
        <RevealOnScroll>
          <p className="text-orange font-medium text-sm uppercase tracking-wider mb-3">
            Hur det funkar
          </p>
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-charcoal mb-4">
            Tre steg till en stressfri matvardag
          </h2>
          <p className="text-charcoal/60 max-w-xl mx-auto">
            Sedan är du fri från matplaneringen för alltid
          </p>
        </RevealOnScroll>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
        {steps.map((step, i) => (
          <RevealOnScroll key={i} delay={0.1 * i}>
            <Card className="bg-cream-light border-0 rounded-2xl p-6 md:p-8 hover:shadow-lg hover:-translate-y-1 transition-all">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 bg-orange text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {step.num}
                  </span>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <h3 className="text-xl font-serif font-semibold text-charcoal mb-3">
                  {step.title}
                </h3>
                <p className="text-charcoal/70 leading-relaxed">{step.desc}</p>
              </CardContent>
            </Card>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}

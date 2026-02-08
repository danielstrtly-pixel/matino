import { RevealOnScroll } from "./RevealOnScroll";

const checklistItems = [
  "5–7 middagar med steg-för-steg-recept",
  "Inköpslista sorterad per butik",
  "Byt ut rätter du inte gillar med ett klick",
  "Anpassad efter antal personer & allergier",
];

const weekMeals = [
  { day: "Mån", meal: "Krämig kycklingpasta med citron & parmesan", time: "25 min", deals: 3 },
  { day: "Tis", meal: "Laxwok med nudlar och sesamdressing", time: "20 min", deals: 2 },
  { day: "Ons", meal: "Tacos med hemgjord salsa och guacamole", time: "30 min", deals: 4 },
  { day: "Tor", meal: "Köttfärssås med pasta och riven ost", time: "25 min", deals: 3 },
  { day: "Fre", meal: "Hemlagad pizza med mozzarella", time: "35 min", deals: 2 },
];

export function ProductDemo() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
        {/* Left - text */}
        <div>
          <RevealOnScroll>
            <p className="text-orange font-medium text-sm uppercase tracking-wider mb-3">
              Se vad du får
            </p>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-charcoal mb-4">
              En komplett veckomeny – klar på sekunder
            </h2>
            <p className="text-charcoal/70 mb-8 leading-relaxed">
              Varje vecka får du en skräddarsydd meny baserad på veckans bästa
              erbjudanden. Komplett med recept, inköpslista och tips.
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={0.1}>
            <ul className="space-y-4">
              {checklistItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-fresh/10 text-fresh rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold">
                    ✓
                  </span>
                  <span className="text-charcoal/80">{item}</span>
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        </div>

        {/* Right - demo card */}
        <RevealOnScroll delay={0.15}>
          <div className="bg-white rounded-2xl shadow-lg border border-cream-dark p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif font-bold text-charcoal text-lg">📅 Vecka 7</h3>
              <span className="text-sm text-charcoal/50">10–14 feb</span>
            </div>
            <div className="space-y-3">
              {weekMeals.map((meal) => (
                <div
                  key={meal.day}
                  className="flex items-start gap-3 p-3 rounded-xl bg-cream-light/50 hover:bg-cream-light transition-colors"
                >
                  <span className="text-xs font-bold text-orange uppercase w-8 pt-0.5 flex-shrink-0">
                    {meal.day}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">
                      {meal.meal}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-charcoal/50">{meal.time}</span>
                      <span className="text-xs bg-orange/10 text-orange rounded-full px-2 py-0.5">
                        🏷 {meal.deals} deals
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

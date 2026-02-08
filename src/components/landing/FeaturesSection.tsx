import { RevealOnScroll } from "./RevealOnScroll";

const features = [
  {
    icon: "📅",
    title: "Komplett veckomeny varje vecka",
    desc: "Lunch och middag för hela veckan, med recept som funkar för vardagen.",
  },
  {
    icon: "💰",
    title: "Baserad på veckans deals",
    desc: "Vi bygger menyn på det som faktiskt är billigt just nu. Smart planering, inte slumpmässiga recept.",
  },
  {
    icon: "📝",
    title: "Inköpslista per butik",
    desc: "Vet exakt vad du ska köpa och var. Slipp springa runt i butiken och fundera.",
  },
  {
    icon: "🔄",
    title: "Byt ut rätter du inte gillar",
    desc: "Allergier? Ogillar fisk? Byt enkelt ut enskilda rätter med AI-förslag.",
  },
  {
    icon: "👨‍👩‍👧‍👦",
    title: "Anpassat för din familj",
    desc: "Ange antal personer, allergier och preferenser. Menyn anpassas efter er.",
  },
  {
    icon: "📱",
    title: "Funkar överallt",
    desc: "Ta fram menyn på mobilen i butiken. Ingen app – funkar direkt i webbläsaren.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-fresh text-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <RevealOnScroll>
            <p className="text-white/60 font-medium text-sm uppercase tracking-wider mb-3">
              Allt du behöver
            </p>
            <h2 className="text-2xl md:text-4xl font-serif font-bold mb-4 text-white">
              Vad du får med SmartaMenyn
            </h2>
          </RevealOnScroll>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <RevealOnScroll key={i} delay={0.05 * i}>
              <div className="bg-white/10 rounded-2xl p-6 hover:bg-white/15 hover:-translate-y-0.5 transition-all">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2 text-white">{feature.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

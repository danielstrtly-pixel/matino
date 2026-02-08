import { RevealOnScroll } from "./RevealOnScroll";

const painPoints = [
  "Klockan är 17:30 och du har ingen aning om vad du ska laga till middag",
  "Du handlar samma tråkiga rätter vecka efter vecka för att du inte orkar tänka nytt",
  "Erbjudanden passerar förbi utan att du hinner utnyttja dem",
  "Halva maten i kylen slängs för att du inte hade en plan",
  "Du vet att du borde planera – men vem har tid med det?",
];

export function PainSection() {
  return (
    <section className="bg-[#1A1A1A] text-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-2xl md:text-3xl font-serif font-bold mb-8 text-center text-white">
              Känns det här bekant?
            </h2>
          </RevealOnScroll>
          <div className="space-y-4 md:space-y-6">
            {painPoints.map((problem, i) => (
              <RevealOnScroll key={i} delay={0.05 * (i + 1)}>
                <div className="flex items-start gap-3 md:gap-4 bg-white/5 border border-white/10 rounded-xl p-4 md:p-5">
                  <span className="text-orange text-xl flex-shrink-0">✕</span>
                  <p className="text-white/75 text-sm md:text-base">{problem}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
          <RevealOnScroll delay={0.35}>
            <div className="mt-10 text-center">
              <p className="text-xl md:text-2xl font-serif italic text-orange">
                Det finns ett enklare sätt.
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

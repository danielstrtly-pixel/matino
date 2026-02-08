"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RevealOnScroll } from "./RevealOnScroll";

const faqItems = [
  {
    question: "Vilka butiker stöds?",
    answer:
      "Just nu hämtar vi erbjudanden från ICA, Hemköp och Lidl. Stöd för Coop är på väg, och Willys och City Gross kommer senare.",
  },
  {
    question: "Kan jag välja bort rätter jag inte gillar?",
    answer:
      "Ja! Du kan enkelt byta ut vilken rätt som helst med ett klick. AI:n föreslår en ny rätt baserad på samma veckans erbjudanden.",
  },
  {
    question: "Hur sparar jag 800 kr per månad?",
    answer:
      "Genom att bygga veckomenyns recept runt veckans erbjudanden och minska matsvinn. De flesta familjer sparar mellan 600 och 1\u00A0000 kr per månad.",
  },
  {
    question: "Hur fungerar gratisperioden?",
    answer:
      "Du testar gratis i 7 dagar utan att ange betalkort. Inga automatiska debiteringar – du väljer själv om du vill fortsätta efter provperioden.",
  },
  {
    question: "Behöver jag ladda ner en app?",
    answer:
      "Nej, SmartaMenyn fungerar direkt i webbläsaren på din mobil, surfplatta eller dator. Ingen installation behövs.",
  },
  {
    question: "Hur säger jag upp?",
    answer:
      "Gå till Kontoinställningar och klicka \"Avsluta prenumeration\". Inga uppsägningstider, inga dolda avgifter.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-cream py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <p className="text-orange font-medium text-sm uppercase tracking-wider mb-3">
                Vanliga frågor
              </p>
              <h2 className="text-2xl md:text-4xl font-serif font-bold text-charcoal">
                Allt du undrar över
              </h2>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.1}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-cream-light rounded-xl border-0 px-6"
                >
                  <AccordionTrigger className="text-left font-medium text-charcoal hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-charcoal/70 pb-5 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

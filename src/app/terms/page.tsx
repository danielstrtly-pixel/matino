import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Användarvillkor | SmartaMenyn",
  description: "Läs användarvillkoren för SmartaMenyn – din tjänst för veckomenyer och matplanering.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between border-b border-cream-dark">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="text-xl font-serif font-bold text-charcoal">SmartaMenyn</span>
        </Link>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-charcoal mb-2">
          Användarvillkor
        </h1>
        <p className="text-charcoal/60 mb-8">Senast uppdaterad: 27 januari 2026</p>

        <div className="prose prose-charcoal max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">1. Om tjänsten</h2>
            <p className="text-charcoal/80 leading-relaxed">
              SmartaMenyn är en digital tjänst som skapar personliga veckomenyer baserade på erbjudanden 
              från svenska matbutiker. Tjänsten tillhandahålls av SmartaMenyn med säte i Stockholm, Sverige.
            </p>
            <p className="text-charcoal/80 leading-relaxed mt-2">
              Genom att skapa ett konto eller använda tjänsten godkänner du dessa villkor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">2. Konto och registrering</h2>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li>Du måste vara minst 18 år eller ha vårdnadshavares godkännande</li>
              <li>Du ansvarar för att uppgifterna du anger är korrekta</li>
              <li>Du ansvarar för att hålla ditt lösenord säkert</li>
              <li>Ett konto är personligt och får inte delas med andra</li>
              <li>Vi förbehåller oss rätten att stänga konton som bryter mot villkoren</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">3. Tjänstens innehåll</h2>
            <p className="text-charcoal/80 leading-relaxed mb-3">SmartaMenyn erbjuder:</p>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li>AI-genererade veckomenyer baserade på erbjudanden och dina preferenser</li>
              <li>Recept och ingredienslistor</li>
              <li>Smarta inköpslistor</li>
              <li>Information om erbjudanden från matbutiker</li>
            </ul>
            <p className="text-charcoal/80 leading-relaxed mt-3">
              <strong>Observera:</strong> Vi garanterar inte att erbjudandeinformation alltid är 100% korrekt 
              eller aktuell. Kontrollera alltid priser i butiken. Recept är förslag – följ alltid 
              säkerhetsanvisningar vid matlagning, särskilt gällande allergier.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">4. Priser och betalning</h2>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li><strong>Provperiod:</strong> 7 dagar gratis utan krav på betalkort</li>
              <li><strong>Prenumeration:</strong> 69 kr/månad efter provperioden</li>
              <li>Priser anges inklusive moms</li>
              <li>Betalning sker månadsvis i förskott</li>
              <li>Vi förbehåller oss rätten att ändra priser med 30 dagars varsel</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">5. Uppsägning och återbetalning</h2>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li>Du kan säga upp din prenumeration när som helst i inställningarna</li>
              <li>Uppsägningen gäller från nästa betalningsperiod</li>
              <li>Du behåller tillgång till tjänsten fram till periodens slut</li>
              <li>Ingen återbetalning för påbörjad betalningsperiod</li>
              <li>Under provperioden kan du avsluta utan kostnad</li>
            </ul>
            <p className="text-charcoal/80 leading-relaxed mt-3">
              <strong>Ångerrätt:</strong> Enligt distansavtalslagen har du 14 dagars ångerrätt från köpet. 
              Kontakta oss på <a href="mailto:hej@smartamenyn.se" className="text-orange hover:underline">hej@smartamenyn.se</a> för att utnyttja ångerrätten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">6. Användning av tjänsten</h2>
            <p className="text-charcoal/80 leading-relaxed mb-3">Du förbinder dig att:</p>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li>Använda tjänsten endast för personligt, icke-kommersiellt bruk</li>
              <li>Inte försöka kringgå tekniska skydd eller begränsningar</li>
              <li>Inte använda automatiserade verktyg för att hämta data</li>
              <li>Inte sprida innehåll från tjänsten i kommersiellt syfte</li>
              <li>Följa svensk lag vid användning av tjänsten</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">7. Immateriella rättigheter</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Allt innehåll i tjänsten (texter, design, logotyper, kod) tillhör SmartaMenyn eller våra 
              licensgivare och skyddas av upphovsrätt. Du får inte kopiera, modifiera eller distribuera 
              innehållet utan vårt skriftliga godkännande.
            </p>
            <p className="text-charcoal/80 leading-relaxed mt-2">
              Recept som genereras för dig får du använda fritt för personligt bruk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">8. Ansvarsbegränsning</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Tjänsten tillhandahålls "i befintligt skick". Vi ansvarar inte för:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80 mt-2">
              <li>Felaktigheter i erbjudandeinformation från butiker</li>
              <li>Tillfälliga driftstopp eller tekniska problem</li>
              <li>Resultat av matlagning baserat på våra recept</li>
              <li>Allergiska reaktioner – kontrollera alltid ingredienser</li>
              <li>Indirekta skador eller följdskador</li>
            </ul>
            <p className="text-charcoal/80 leading-relaxed mt-3">
              Vårt ansvar är begränsat till det belopp du betalat för tjänsten under de senaste 12 månaderna.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">9. Ändringar i tjänsten och villkoren</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Vi kan när som helst uppdatera tjänsten eller dessa villkor. Väsentliga ändringar meddelas 
              minst 30 dagar i förväg via e-post. Fortsatt användning efter ändringar innebär godkännande 
              av de nya villkoren.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">10. Tvister och tillämplig lag</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Svensk lag gäller för dessa villkor. Tvister ska i första hand lösas genom dialog. 
              Om vi inte kan enas kan tvisten prövas av Allmänna reklamationsnämnden (ARN) för konsumenttvister, 
              eller av svensk allmän domstol.
            </p>
            <p className="text-charcoal/80 leading-relaxed mt-2">
              ARN: <a href="https://www.arn.se" className="text-orange hover:underline" target="_blank" rel="noopener noreferrer">www.arn.se</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">11. Kontakt</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Har du frågor om dessa villkor? Kontakta oss:
            </p>
            <p className="text-charcoal/80 leading-relaxed mt-2">
              E-post: <a href="mailto:hej@smartamenyn.se" className="text-orange hover:underline">hej@smartamenyn.se</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-cream-dark flex gap-6">
          <Link href="/" className="text-orange hover:underline">← Tillbaka till startsidan</Link>
          <Link href="/privacy" className="text-orange hover:underline">Integritetspolicy</Link>
        </div>
      </main>
    </div>
  );
}

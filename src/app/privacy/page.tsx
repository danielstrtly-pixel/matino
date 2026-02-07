import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Integritetspolicy | SmartaMenyn",
  description: "Läs om hur SmartaMenyn hanterar dina personuppgifter och skyddar din integritet.",
};

export default function PrivacyPage() {
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
          Integritetspolicy
        </h1>
        <p className="text-charcoal/60 mb-8">Senast uppdaterad: 27 januari 2026</p>

        <div className="prose prose-charcoal max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">1. Vem är ansvarig för dina uppgifter?</h2>
            <p className="text-charcoal/80 leading-relaxed">
              SmartaMenyn ({'"'}vi{'"'}, {'"'}oss{'"'}, {'"'}tjänsten{'"'}) är personuppgiftsansvarig för behandlingen av dina personuppgifter.
              Vi följer EU:s dataskyddsförordning (GDPR) och svensk lagstiftning.
            </p>
            <p className="text-charcoal/80 leading-relaxed mt-2">
              Kontakt: <a href="mailto:hej@smartamenyn.se" className="text-orange hover:underline">hej@smartamenyn.se</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">2. Vilka uppgifter samlar vi in?</h2>
            <p className="text-charcoal/80 leading-relaxed mb-3">Vi samlar in följande uppgifter:</p>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li><strong>Kontouppgifter:</strong> E-postadress och lösenord (krypterat) när du skapar ett konto</li>
              <li><strong>Preferenser:</strong> Dina valda butiker, matpreferenser, allergier och hushållsstorlek</li>
              <li><strong>Användningsdata:</strong> Vilka menyer du skapar, recept du sparar och ändringar du gör</li>
              <li><strong>Teknisk data:</strong> IP-adress, webbläsartyp och enhetsinformation för att tjänsten ska fungera</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">3. Varför behandlar vi dina uppgifter?</h2>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li><strong>Leverera tjänsten:</strong> Skapa personliga veckomenyer och inköpslistor baserat på dina preferenser</li>
              <li><strong>Förbättra tjänsten:</strong> Analysera användningsmönster för att göra SmartaMenyn bättre</li>
              <li><strong>Kommunikation:</strong> Skicka viktiga meddelanden om ditt konto eller tjänsten</li>
              <li><strong>Juridiska krav:</strong> Uppfylla lagkrav som bokföring</li>
            </ul>
            <p className="text-charcoal/80 leading-relaxed mt-3">
              Rättslig grund: Fullgörande av avtal (för att leverera tjänsten) och berättigat intresse (för förbättringar).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">4. Vilka delar vi uppgifter med?</h2>
            <p className="text-charcoal/80 leading-relaxed mb-3">Vi delar uppgifter med följande parter:</p>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li><strong>Supabase:</strong> Vår databasvärd (servrar inom EU)</li>
              <li><strong>Vercel:</strong> Vår webbhotellsleverantör</li>
              <li><strong>OpenAI:</strong> För AI-generering av menyer (anonymiserad data)</li>
              <li><strong>Betalningsleverantör:</strong> För hantering av prenumerationer (vi lagrar inga kortuppgifter)</li>
            </ul>
            <p className="text-charcoal/80 leading-relaxed mt-3">
              Vi säljer aldrig dina uppgifter till tredje part.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">5. Hur länge sparar vi uppgifterna?</h2>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li><strong>Kontouppgifter:</strong> Så länge du har ett aktivt konto, plus 30 dagar efter radering</li>
              <li><strong>Menyer och preferenser:</strong> Så länge du har ett aktivt konto</li>
              <li><strong>Bokföringsunderlag:</strong> 7 år enligt svensk lag</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">6. Dina rättigheter enligt GDPR</h2>
            <p className="text-charcoal/80 leading-relaxed mb-3">Du har rätt att:</p>
            <ul className="list-disc pl-6 space-y-2 text-charcoal/80">
              <li><strong>Få tillgång:</strong> Begära en kopia av alla uppgifter vi har om dig</li>
              <li><strong>Rätta:</strong> Korrigera felaktiga uppgifter</li>
              <li><strong>Radera:</strong> Be oss radera dina uppgifter ({'"'}rätten att bli glömd{'"'})</li>
              <li><strong>Flytta:</strong> Få ut dina uppgifter i ett maskinläsbart format</li>
              <li><strong>Invända:</strong> Motsätta dig viss behandling</li>
              <li><strong>Begränsa:</strong> Begära att vi begränsar behandlingen</li>
            </ul>
            <p className="text-charcoal/80 leading-relaxed mt-3">
              Kontakta oss på <a href="mailto:hej@smartamenyn.se" className="text-orange hover:underline">hej@smartamenyn.se</a> för att utöva dina rättigheter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">7. Cookies</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Vi använder nödvändiga cookies för att tjänsten ska fungera (inloggning, sessionshantering). 
              Vi använder inga spårningscookies eller tredjepartscookies för reklam.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">8. Säkerhet</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Vi skyddar dina uppgifter med kryptering (HTTPS, krypterade lösenord), 
              säker autentisering och begränsad åtkomst. Våra leverantörer uppfyller höga säkerhetsstandarder.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">9. Ändringar i policyn</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Vi kan uppdatera denna policy. Väsentliga ändringar meddelas via e-post eller i tjänsten. 
              Fortsatt användning efter ändringar innebär att du godkänner den nya policyn.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-charcoal mb-3">10. Klagomål</h2>
            <p className="text-charcoal/80 leading-relaxed">
              Om du är missnöjd med hur vi hanterar dina uppgifter kan du kontakta oss eller lämna klagomål till 
              Integritetsskyddsmyndigheten (IMY): <a href="https://www.imy.se" className="text-orange hover:underline" target="_blank" rel="noopener noreferrer">www.imy.se</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-cream-dark">
          <Link href="/" className="text-orange hover:underline">← Tillbaka till startsidan</Link>
        </div>
      </main>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chat } from '@/lib/openrouter';

const SYSTEM_PROMPT = `Du är SmartaMenyns matexpert. Du intervjuar användaren för att förstå deras matvanor och preferenser så att du kan skapa den perfekta veckomenyn.

REGLER:
- Var varm, nyfiken och personlig. Inte klinisk.
- Ställ EN fråga i taget, max 2-3 meningar per meddelande.
- Använd emoji sparsamt men naturligt.
- Håll konversationen kort – max 6-7 frågor totalt.
- Anpassa följdfrågor baserat på svaren.

FRÅGOR ATT TÄCKA (i ungefärlig ordning):
1. Hur många är ni i hushållet?
2. Berätta om en vanlig matvecka – vad brukar ni äta? (viktigast!)
3. Är det något ni vill förändra? Mer variation, nyttigare, snabbare?
4. Allergier eller saker ni absolut vill undvika?
5. Finns det dagar ni vill ha lite lyxigare mat? (fredag, helg?)
6. Dagar då det måste gå snabbt?

NÄR ALLA FRÅGOR ÄR BESVARADE:
VIKTIGT: Du MÅSTE använda exakt dessa markörer. Skriv INTE sammanfattningen utan markörerna.
Skriv sammanfattningen i detta EXAKTA format:

---SAMMANFATTNING---
[Skriv en DETALJERAD sammanfattning i 2:a person. BEVARA specifika rätter med tillagning och smaksättning – skriv INTE bara "kyckling" om de sa "krämig kycklinggryta med curry och kokosmjölk". Detaljer om smak, tillagning och stil är avgörande.]
---PROFIL---
[Skriv i JSON-format, UTAN markdown code blocks:]
{
  "householdSize": <antal>,
  "currentMeals": "<DETALJERAD beskrivning av specifika rätter de brukar äta, med tillagning och smaker – inte bara ingredienser>",
  "wantedChanges": "<vad de vill ändra>",
  "restrictions": ["<allergier/undvikanden>"],
  "luxuryDays": "<vilka dagar>",
  "quickDays": "<vilka dagar och maxtid>",
  "preferences": "<UTFÖRLIG fri text med ALL info – specifika rätter, smaker, tillagningsstilar, allt som hjälper skapa den perfekta menyn>",
  "menuPrompt": "<en DETALJERAD prompt för att generera menyn – inkludera specifika rätter de gillar som inspiration, smakprofiler, tillagningspreferenser, allt>"
}
---SLUT---

Fråga sedan: "Stämmer det här? Vill du ändra något?"`;

export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Build conversation with system prompt
    const fullMessages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let response = await chat(fullMessages, {
      model: 'google/gemini-2.0-flash-001',
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Check if this response contains a summary
    let hasSummary = response.includes('---SAMMANFATTNING---') && response.includes('---SLUT---');

    // If AI seems to be summarizing but didn't use the markers, force a follow-up
    if (!hasSummary && (
      response.includes('sammanfattning') || 
      response.includes('Stämmer det') ||
      response.includes('all information')
    )) {
      const retryMessages = [
        ...fullMessages,
        { role: 'assistant' as const, content: response },
        { role: 'user' as const, content: 'Ja, gör en sammanfattning!' },
      ];

      const retryResponse = await chat(retryMessages, {
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.5,
        max_tokens: 2000,
      });

      if (retryResponse.includes('---SAMMANFATTNING---')) {
        response = retryResponse;
        hasSummary = true;
      }
    }

    return NextResponse.json({ 
      message: response,
      hasSummary,
    });
  } catch (error) {
    console.error('Interview error:', error);
    return NextResponse.json(
      { error: 'Failed to process interview' },
      { status: 500 }
    );
  }
}

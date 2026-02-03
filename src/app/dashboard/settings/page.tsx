"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { InterviewChat } from "@/components/InterviewChat";

interface InterviewProfile {
  householdSize?: number;
  currentMeals?: string;
  wantedChanges?: string;
  restrictions?: string[];
  luxuryDays?: string;
  quickDays?: string;
  preferences?: string;
  menuPrompt?: string;
  // Legacy fields
  currentHabits?: string;
  goals?: string[];
  timeConstraints?: string;
  budgetFocus?: string;
  cuisinePreferences?: string[];
  cookingStyle?: string;
  summary?: string;
}

export default function SettingsPage() {
  const [interviewProfile, setInterviewProfile] = useState<InterviewProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const prefsRes = await fetch("/api/user/preferences");
        if (prefsRes.ok) {
          const data = await prefsRes.json();
          setInterviewProfile(data.interviewProfile || null);
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleInterviewSaved = async () => {
    // Reload preferences after interview is saved
    try {
      const prefsRes = await fetch("/api/user/preferences");
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setInterviewProfile(data.interviewProfile || null);
      }
    } catch (e) {
      console.error("Failed to reload preferences:", e);
    }
    setSaveMessage("✅ Matprofil sparad!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-2xl mb-2">🔄</div>
          <p className="text-gray-500">Laddar inställningar...</p>
        </div>
      </div>
    );
  }

  const profile = interviewProfile;
  const hasProfile = profile && (
    profile.currentMeals || 
    profile.currentHabits || 
    profile.restrictions?.length || 
    profile.preferences
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inställningar</h1>
        <p className="text-gray-600 mt-2">
          Berätta vad du gillar så skapar vi perfekta menyer för dig.
        </p>
        {saveMessage && (
          <p className="text-sm text-green-600 mt-2">{saveMessage}</p>
        )}
      </div>

      {/* Interview CTA or Profile Display */}
      {!hasProfile ? (
        // No profile yet - show CTA
        <Card className="mb-8 bg-gradient-to-r from-fresh to-fresh/80 text-white border-0 rounded-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎙️</div>
            <h2 className="text-2xl font-bold mb-3">Berätta vad du gillar att äta</h2>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              Svara på några frågor så skapar vi den perfekta menyn för just ditt hushåll. 
              Tar ca 2 minuter.
            </p>
            <Button
              size="lg"
              className="bg-white text-fresh hover:bg-cream-light rounded-full px-10 py-6 font-semibold shadow-lg text-lg"
              onClick={() => setInterviewOpen(true)}
            >
              Starta intervju
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Has profile - show it
        <Card className="mb-8 border-2 border-fresh/20 rounded-2xl overflow-hidden">
          <CardHeader className="bg-fresh/5 border-b border-fresh/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span>🎯</span> Din matprofil
                </CardTitle>
                <CardDescription className="mt-1">
                  Baserad på din intervju
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInterviewOpen(true)}
                className="rounded-full"
              >
                Gör om intervjun
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            {/* Household */}
            {profile.householdSize && (
              <div className="flex items-center gap-3 pb-4 border-b">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <div>
                  <p className="font-medium">Hushåll</p>
                  <p className="text-gray-600">{profile.householdSize} personer</p>
                </div>
              </div>
            )}

            {/* Current meals / preferences */}
            {(profile.currentMeals || profile.currentHabits) && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span>😋</span> Era maträtter & preferenser
                </h4>
                <p className="text-gray-600 leading-relaxed bg-cream-light/30 rounded-xl p-4">
                  {profile.currentMeals || profile.currentHabits}
                </p>
              </div>
            )}

            {/* Wanted changes */}
            {profile.wantedChanges && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span>✨</span> Vill förändra
                </h4>
                <p className="text-gray-600 leading-relaxed bg-blue-50 rounded-xl p-4">
                  {profile.wantedChanges}
                </p>
              </div>
            )}

            {/* Restrictions / allergies */}
            {profile.restrictions && profile.restrictions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span>🚫</span> Undviker / allergier
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.restrictions.map((item, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="rounded-full px-4 py-1.5 border-orange-300 text-orange-700 bg-orange-50"
                    >
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Luxury days */}
            {profile.luxuryDays && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">🍾</span>
                <div>
                  <p className="font-medium">Lyxigare mat</p>
                  <p className="text-gray-600">{profile.luxuryDays}</p>
                </div>
              </div>
            )}

            {/* Quick days */}
            {profile.quickDays && (
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-medium">Snabb mat</p>
                  <p className="text-gray-600">{profile.quickDays}</p>
                </div>
              </div>
            )}

            {/* Extra preferences */}
            {profile.preferences && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span>💡</span> Övrigt
                </h4>
                <p className="text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 text-sm">
                  {profile.preferences}
                </p>
              </div>
            )}

            {/* Legacy: Goals */}
            {profile.goals && profile.goals.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span>🎯</span> Mål
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.goals.map((goal, i) => (
                    <Badge key={i} variant="secondary" className="rounded-full px-3 py-1 bg-green-50 text-green-700">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Legacy: Time constraints */}
            {profile.timeConstraints && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div>
                  <p className="font-medium">Tillagningstid</p>
                  <p className="text-gray-600">{profile.timeConstraints}</p>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* Interview dialog */}
      <InterviewChat
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        onSaved={handleInterviewSaved}
      />

      {/* Subscription */}
      <SubscriptionCard />
    </div>
  );
}

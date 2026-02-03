"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type EditableField = 'householdSize' | 'currentMeals' | 'wantedChanges' | 'restrictions' | 'luxuryDays' | 'quickDays' | 'preferences';

export default function SettingsPage() {
  const [interviewProfile, setInterviewProfile] = useState<InterviewProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
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

  const handleInterviewSaved = async () => {
    await loadPreferences();
    setSaveMessage("✅ Matprofil sparad!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const startEdit = (field: EditableField) => {
    if (!interviewProfile) return;
    
    if (field === 'restrictions') {
      setEditValue((interviewProfile.restrictions || []).join(', '));
    } else if (field === 'householdSize') {
      setEditValue(String(interviewProfile.householdSize || 2));
    } else {
      setEditValue((interviewProfile[field] as string) || '');
    }
    setEditingField(field);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editingField || !interviewProfile) return;
    
    setIsSaving(true);
    
    // Build updated profile
    const updatedProfile = { ...interviewProfile };
    
    if (editingField === 'restrictions') {
      updatedProfile.restrictions = editValue.split(',').map(s => s.trim()).filter(Boolean);
    } else if (editingField === 'householdSize') {
      updatedProfile.householdSize = parseInt(editValue) || 2;
    } else {
      (updatedProfile as any)[editingField] = editValue;
    }

    try {
      const res = await fetch("/api/interview/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: updatedProfile }),
      });

      if (res.ok) {
        setInterviewProfile(updatedProfile);
        setSaveMessage("✅ Uppdaterat!");
        setTimeout(() => setSaveMessage(null), 2000);
      } else {
        setSaveMessage("❌ Kunde inte spara");
      }
    } catch (e) {
      console.error("Failed to save:", e);
      setSaveMessage("❌ Något gick fel");
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setEditValue("");
    }
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

  // Editable field component
  const EditableSection = ({ 
    field, 
    icon, 
    title, 
    children,
    multiline = false 
  }: { 
    field: EditableField; 
    icon: string; 
    title: string; 
    children: React.ReactNode;
    multiline?: boolean;
  }) => {
    const isEditing = editingField === field;
    
    return (
      <div className="group">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span>{icon}</span> {title}
          </h4>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
              onClick={() => startEdit(field)}
            >
              ✏️ Ändra
            </Button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            {multiline ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="min-h-[100px]"
                autoFocus
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                {isSaving ? "Sparar..." : "Spara"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    );
  };

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
        // Has profile - show it with edit options
        <Card className="mb-8 border-2 border-fresh/20 rounded-2xl overflow-hidden">
          <CardHeader className="bg-fresh/5 border-b border-fresh/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span>🎯</span> Din matprofil
                </CardTitle>
                <CardDescription className="mt-1">
                  Klicka på en sektion för att ändra • eller gör om hela intervjun
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInterviewOpen(true)}
                className="rounded-full"
              >
                🎙️ Ny intervju
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">

            {/* Household */}
            {profile.householdSize && (
              <div className="flex items-center gap-3 pb-4 border-b group">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
                <div className="flex-1">
                  <p className="font-medium">Hushåll</p>
                  {editingField === 'householdSize' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20"
                        autoFocus
                      />
                      <span className="text-gray-600">personer</span>
                      <Button size="sm" onClick={saveEdit} disabled={isSaving}>Spara</Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Avbryt</Button>
                    </div>
                  ) : (
                    <p className="text-gray-600">{profile.householdSize} personer</p>
                  )}
                </div>
                {editingField !== 'householdSize' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
                    onClick={() => startEdit('householdSize')}
                  >
                    ✏️
                  </Button>
                )}
              </div>
            )}

            {/* Current meals / preferences */}
            {(profile.currentMeals || profile.currentHabits) && (
              <EditableSection field="currentMeals" icon="😋" title="Era maträtter & preferenser" multiline>
                <p className="text-gray-600 leading-relaxed bg-cream-light/30 rounded-xl p-4">
                  {profile.currentMeals || profile.currentHabits}
                </p>
              </EditableSection>
            )}

            {/* Wanted changes */}
            {profile.wantedChanges && (
              <EditableSection field="wantedChanges" icon="✨" title="Vill förändra" multiline>
                <p className="text-gray-600 leading-relaxed bg-blue-50 rounded-xl p-4">
                  {profile.wantedChanges}
                </p>
              </EditableSection>
            )}

            {/* Restrictions / allergies */}
            {profile.restrictions && profile.restrictions.length > 0 && (
              <EditableSection field="restrictions" icon="🚫" title="Undviker / allergier">
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
              </EditableSection>
            )}

            {/* Luxury days */}
            {profile.luxuryDays && (
              <EditableSection field="luxuryDays" icon="🍾" title="Lyxigare mat">
                <p className="text-gray-600">{profile.luxuryDays}</p>
              </EditableSection>
            )}

            {/* Quick days */}
            {profile.quickDays && (
              <EditableSection field="quickDays" icon="⚡" title="Snabb mat">
                <p className="text-gray-600">{profile.quickDays}</p>
              </EditableSection>
            )}

            {/* Extra preferences */}
            {profile.preferences && (
              <EditableSection field="preferences" icon="💡" title="Övrigt" multiline>
                <p className="text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 text-sm">
                  {profile.preferences}
                </p>
              </EditableSection>
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

"use client";

import { useState, useEffect, useRef } from "react";
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
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Use ref to store edit value to avoid re-renders
  const editValueRef = useRef<string>("");

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefsRes = await fetch("/api/user/preferences");
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setInterviewProfile(data.interviewProfile || null);
        setEmail(data.email || null);
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
    
    let value = "";
    if (field === 'restrictions') {
      value = (interviewProfile.restrictions || []).join(', ');
    } else if (field === 'householdSize') {
      value = String(interviewProfile.householdSize || 2);
    } else if (field === 'currentMeals') {
      value = interviewProfile.currentMeals || interviewProfile.currentHabits || '';
    } else {
      value = (interviewProfile[field] as string) || '';
    }
    editValueRef.current = value;
    setEditingField(field);
  };

  const cancelEdit = () => {
    setEditingField(null);
    editValueRef.current = "";
  };

  const saveEdit = async () => {
    if (!editingField || !interviewProfile) return;
    
    setIsSaving(true);
    const value = editValueRef.current;
    
    const updatedProfile = { ...interviewProfile };
    
    if (editingField === 'restrictions') {
      updatedProfile.restrictions = value.split(',').map(s => s.trim()).filter(Boolean);
    } else if (editingField === 'householdSize') {
      updatedProfile.householdSize = parseInt(value) || 2;
    } else {
      (updatedProfile as any)[editingField] = value;
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
      editValueRef.current = "";
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inställningar</h1>
        <p className="text-gray-600 mt-2">
          Berätta vad du gillar så skapar vi perfekta menyer för dig.
        </p>
        {email && (
          <p className="text-sm text-gray-500 mt-1">
            Inloggad som {email}
          </p>
        )}
        {saveMessage && (
          <p className="text-sm text-green-600 mt-2">{saveMessage}</p>
        )}
      </div>

      {!hasProfile ? (
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
        <Card className="mb-8 border-2 border-fresh/20 rounded-2xl overflow-hidden">
          <CardHeader className="bg-fresh/5 border-b border-fresh/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span>🎯</span> Din matprofil
                </CardTitle>
                <CardDescription className="mt-1">
                  Klicka Ändra för att redigera en sektion
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
            <ProfileField
              icon="👨‍👩‍👧‍👦"
              title="Hushåll"
              value={`${profile.householdSize || 2} personer`}
              isEditing={editingField === 'householdSize'}
              onEdit={() => startEdit('householdSize')}
              onSave={saveEdit}
              onCancel={cancelEdit}
              isSaving={isSaving}
              editContent={
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    className="w-20"
                    autoFocus
                  />
                  <span className="text-gray-600">personer</span>
                </div>
              }
            />

            {/* Current meals */}
            {(profile.currentMeals || profile.currentHabits) && (
              <ProfileField
                icon="😋"
                title="Era maträtter & preferenser"
                value={profile.currentMeals || profile.currentHabits || ''}
                isEditing={editingField === 'currentMeals'}
                onEdit={() => startEdit('currentMeals')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                multiline
                editContent={
                  <Textarea
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    className="min-h-[100px]"
                    autoFocus
                  />
                }
                displayClass="bg-cream-light/30 rounded-xl p-4"
              />
            )}

            {/* Wanted changes */}
            {profile.wantedChanges && (
              <ProfileField
                icon="✨"
                title="Vill förändra"
                value={profile.wantedChanges}
                isEditing={editingField === 'wantedChanges'}
                onEdit={() => startEdit('wantedChanges')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                multiline
                editContent={
                  <Textarea
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    className="min-h-[80px]"
                    autoFocus
                  />
                }
                displayClass="bg-blue-50 rounded-xl p-4"
              />
            )}

            {/* Restrictions */}
            {profile.restrictions && profile.restrictions.length > 0 && (
              <ProfileField
                icon="🚫"
                title="Undviker / allergier"
                isEditing={editingField === 'restrictions'}
                onEdit={() => startEdit('restrictions')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                editContent={
                  <Input
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    placeholder="Separera med komma"
                    autoFocus
                  />
                }
                customDisplay={
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
                }
              />
            )}

            {/* Luxury days */}
            {profile.luxuryDays && (
              <ProfileField
                icon="🍾"
                title="Lyxigare mat"
                value={profile.luxuryDays}
                isEditing={editingField === 'luxuryDays'}
                onEdit={() => startEdit('luxuryDays')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                editContent={
                  <Input
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    autoFocus
                  />
                }
              />
            )}

            {/* Quick days */}
            {profile.quickDays && (
              <ProfileField
                icon="⚡"
                title="Snabb mat"
                value={profile.quickDays}
                isEditing={editingField === 'quickDays'}
                onEdit={() => startEdit('quickDays')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                editContent={
                  <Input
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    autoFocus
                  />
                }
              />
            )}

            {/* Preferences */}
            {profile.preferences && (
              <ProfileField
                icon="💡"
                title="Övrigt"
                value={profile.preferences}
                isEditing={editingField === 'preferences'}
                onEdit={() => startEdit('preferences')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                isSaving={isSaving}
                multiline
                editContent={
                  <Textarea
                    defaultValue={editValueRef.current}
                    onChange={(e) => { editValueRef.current = e.target.value; }}
                    className="min-h-[80px]"
                    autoFocus
                  />
                }
                displayClass="bg-gray-50 rounded-xl p-4 text-sm"
              />
            )}

          </CardContent>
        </Card>
      )}

      <InterviewChat
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        onSaved={handleInterviewSaved}
      />

      <SubscriptionCard />
    </div>
  );
}

// Separate component to avoid re-renders
function ProfileField({
  icon,
  title,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  isSaving,
  editContent,
  customDisplay,
  displayClass,
  multiline,
}: {
  icon: string;
  title: string;
  value?: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  editContent: React.ReactNode;
  customDisplay?: React.ReactNode;
  displayClass?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium flex items-center gap-2">
          <span>{icon}</span> {title}
        </h4>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900"
            onClick={onEdit}
          >
            ✏️ Ändra
          </Button>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          {editContent}
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Sparar..." : "Spara"}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
              Avbryt
            </Button>
          </div>
        </div>
      ) : customDisplay ? (
        customDisplay
      ) : (
        <p className={`text-gray-600 leading-relaxed ${displayClass || ''}`}>
          {value}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InterviewChat } from "@/components/InterviewChat";
import { OnboardingStoreSelect } from "@/components/OnboardingStoreSelect";

type MenuMode = "taste" | "budget";

const STEPS = [
  { label: "Butiker", key: "stores" },
  { label: "Matprofil", key: "interview" },
  { label: "Skapa meny", key: "generate" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isCompleted
                    ? "bg-fresh text-white"
                    : isActive
                    ? "bg-orange text-white"
                    : "bg-cream-dark text-gray-500"
                }`}
              >
                {isCompleted ? "\u2713" : stepNum}
              </div>
              <span
                className={`text-sm ${
                  isActive ? "font-semibold text-charcoal" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  isCompleted ? "bg-fresh" : "bg-cream-dark"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function WelcomeClient() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=welcome, 1=interview, 2=stores, 3=generate
  const [mode, setMode] = useState<MenuMode>("taste");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skipToMenu = () => {
    router.push("/dashboard/menu");
  };

  const generateMenu = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kunde inte skapa meny");
      }
      router.push("/dashboard/menu");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
      setGenerating(false);
    }
  };

  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-4">
          Välkommen till SmartaMenyn!
        </h1>
        <p className="text-gray-600 mb-8">
          Vi hjälper dig skapa en personlig veckomeny baserad på dina preferenser och veckans bästa erbjudanden.
        </p>

        <div className="text-left bg-white rounded-2xl border p-6 mb-8 space-y-4">
          <div className="flex gap-3 items-start">
            <span className="text-xl mt-0.5">1.</span>
            <div>
              <p className="font-semibold text-charcoal">Välj dina butiker</p>
              <p className="text-sm text-gray-500">Vi matchar erbjudanden från ICA, Hemköp, Coop och Lidl</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-xl mt-0.5">2.</span>
            <div>
              <p className="font-semibold text-charcoal">Berätta vad du gillar</p>
              <p className="text-sm text-gray-500">En kort chatt om dina matvanor och preferenser</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-xl mt-0.5">3.</span>
            <div>
              <p className="font-semibold text-charcoal">Få din veckomeny</p>
              <p className="text-sm text-gray-500">AI skapar recept med riktiga receptlänkar och matchade deals</p>
            </div>
          </div>
        </div>

        <StepIndicator currentStep={0} />

        <div className="mt-8 space-y-3">
          <Button
            onClick={() => setStep(1)}
            className="w-full bg-orange hover:bg-orange/90 text-white"
            size="lg"
          >
            Kom igång
          </Button>
          <button
            onClick={skipToMenu}
            className="text-sm text-gray-500 hover:text-charcoal transition-colors"
          >
            Hoppa över &mdash; gå direkt till menyn
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Store selection (first so offers sync while user does interview)
  if (step === 1) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="mb-6">
          <StepIndicator currentStep={1} />
        </div>

        <h2 className="font-display text-2xl font-bold text-charcoal mb-2">
          Välj dina butiker
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Vi matchar veckans erbjudanden från dina butiker med recepten i din meny.
        </p>

        <OnboardingStoreSelect onComplete={() => setStep(2)} />

        <div className="mt-4 text-center">
          <button
            onClick={() => setStep(2)}
            className="text-sm text-gray-500 hover:text-charcoal transition-colors"
          >
            Hoppa över detta steg
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Interview (offers sync in background from step 1)
  if (step === 2) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="mb-6">
          <StepIndicator currentStep={2} />
        </div>

        <InterviewChat
          open={true}
          variant="inline"
          onSaved={() => setStep(3)}
          onClose={() => setStep(3)}
        />

        <div className="mt-4 text-center">
          <button
            onClick={() => setStep(3)}
            className="text-sm text-gray-500 hover:text-charcoal transition-colors"
          >
            Hoppa över detta steg
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Generate menu
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <div className="mb-6">
        <StepIndicator currentStep={3} />
      </div>

      <h2 className="font-display text-2xl font-bold text-charcoal mb-2">
        Skapa din första veckomeny
      </h2>
      <p className="text-gray-600 text-sm mb-6">
        Välj hur du vill att menyn ska skapas.
      </p>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setMode("taste")}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            mode === "taste"
              ? "border-fresh bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="text-2xl">🍽️</span>
          <p className="font-semibold mt-2">Äta gott</p>
          <p className="text-xs text-gray-500 mt-1">Smak i fokus, erbjudanden som bonus</p>
        </button>
        <button
          onClick={() => setMode("budget")}
          className={`p-4 rounded-2xl border-2 transition-all text-left ${
            mode === "budget"
              ? "border-fresh bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className="text-2xl">💰</span>
          <p className="font-semibold mt-2">Spara pengar</p>
          <p className="text-xs text-gray-500 mt-1">Bygg menyn kring veckans deals</p>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={generateMenu}
        disabled={generating}
        className="w-full bg-orange hover:bg-orange/90 text-white"
        size="lg"
      >
        {generating ? "Skapar din veckomeny..." : "Skapa veckomeny"}
      </Button>

      {generating && (
        <p className="text-sm text-gray-500 text-center mt-3 animate-pulse">
          Söker recept och matchar erbjudanden. Detta tar ca 30 sekunder...
        </p>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={skipToMenu}
          className="text-sm text-gray-500 hover:text-charcoal transition-colors"
        >
          Hoppa över &mdash; gå direkt till menyn
        </button>
      </div>
    </div>
  );
}

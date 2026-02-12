"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterviewChatProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  variant?: "dialog" | "inline";
}

function InterviewChatInner({
  open,
  onClose,
  onSaved,
}: Omit<InterviewChatProps, "variant">) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Start conversation when dialog opens
  useEffect(() => {
    if (open && !started) {
      setStarted(true);
      startConversation();
    }
    if (!open) {
      setStarted(false);
      setMessages([]);
      setSummary(null);
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, started]);

  const startConversation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hej! Jag vill berätta om mina matpreferenser." }],
        }),
      });
      const data = await response.json();
      if (data.message) {
        setMessages([{ role: "assistant", content: data.message }]);
      }
    } catch (error) {
      console.error("Failed to start:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await response.json();

      if (data.message) {
        // Check for summary
        if (data.hasSummary) {
          const summaryMatch = data.message.match(/---SAMMANFATTNING---\n?([\s\S]*?)---PROFIL---/);
          const profileMatch = data.message.match(/---PROFIL---\n?([\s\S]*?)---SLUT---/);

          if (summaryMatch) {
            setSummary(summaryMatch[1].trim());
          }

          if (profileMatch) {
            try {
              // Strip markdown code blocks if present
              let jsonStr = profileMatch[1].trim();
              jsonStr = jsonStr.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
              const parsed = JSON.parse(jsonStr);
              setProfile(parsed);
            } catch (e) {
              console.error("Failed to parse profile:", e);
            }
          }

          // Show clean message without markers
          const cleanMessage = data.message
            .replace(/---SAMMANFATTNING---[\s\S]*---SLUT---/, '')
            .trim();

          if (cleanMessage) {
            setMessages([...newMessages, { role: "assistant", content: cleanMessage }]);
          }
        } else {
          setMessages([...newMessages, { role: "assistant", content: data.message }]);
        }
      }
    } catch (error) {
      console.error("Failed to send:", error);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const response = await fetch("/api/interview/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (response.ok) {
        onSaved();
        onClose();
      } else {
        alert("Kunde inte spara. Försök igen.");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Något gick fel. Försök igen.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-[300px] max-h-[50vh] space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-fresh text-white rounded-br-md"
                  : "bg-cream-light text-charcoal rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-cream-light rounded-2xl rounded-bl-md px-4 py-3 text-sm">
              <span className="animate-pulse">Skriver...</span>
            </div>
          </div>
        )}

        {/* Summary card */}
        {summary && profile && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-green-800">Din matprofil</h3>
            <p className="text-sm text-green-700 leading-relaxed">{summary}</p>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-fresh hover:bg-fresh/90 text-white"
              >
                {saving ? "Sparar..." : "Ser bra ut \u2013 spara!"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSummary(null);
                  setProfile(null);
                }}
                disabled={saving}
              >
                Ändra något
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {!summary && (
        <div className="border-t px-4 py-3 flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Skriv ditt svar..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-fresh hover:bg-fresh/90 text-white px-4 self-end"
          >
            ➤
          </Button>
        </div>
      )}
    </>
  );
}

export function InterviewChat({ open, onClose, onSaved, variant = "dialog" }: InterviewChatProps) {
  if (variant === "inline") {
    return (
      <div className="flex flex-col bg-white rounded-2xl border shadow-sm max-h-[60vh]">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Berätta om dina matvanor
          </h3>
        </div>
        <InterviewChatInner open={open} onClose={onClose} onSaved={onSaved} />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            Berätta om dina matvanor
          </DialogTitle>
        </DialogHeader>
        <InterviewChatInner open={open} onClose={onClose} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}

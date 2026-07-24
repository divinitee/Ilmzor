import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Sparkles } from "lucide-react";
import MessageBubble from "@/components/tutor/MessageBubble";
import { useAppLang } from "@/hooks/useAppLang";

const AGENT_NAME = "vocabulary_tutor";

export default function VocabTutorChat() {
  const { t } = useAppLang();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    try {
      const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      let conv = existing?.[0];
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: "Vocabulary Tutor", description: "Word mastery practice" },
        });
      }
      setConversation(conv);
      setMessages(conv.messages || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !conversation) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 10rem)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{t("tutor.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("tutor.sub")}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 px-4">
            {t("tutor.empty")}
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("tutor.placeholder")}
          disabled={sending}
          className="flex-1 h-11 px-4 border border-input rounded-xl text-sm bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 select-none hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
}
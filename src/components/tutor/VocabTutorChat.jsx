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
  const [deletedIds, setDeletedIds] = useState(new Set());
  const bottomRef = useRef(null);

  const storageKey = (convId) => `tutor_deleted_${convId}`;

  const loadDeleted = (convId) => {
    if (!convId) return new Set();
    try {
      const raw = localStorage.getItem(storageKey(convId));
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const persistDeleted = (convId, ids) => {
    if (!convId) return;
    try {
      localStorage.setItem(storageKey(convId), JSON.stringify([...ids]));
    } catch {}
  };

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages((data.messages || []).filter(m => !deletedIds.has(m.id)));
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    try {
      const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const conv = existing?.[0];
      if (conv) {
        setConversation(conv);
        setDeletedIds(loadDeleted(conv.id));
        setMessages(conv.messages || []);
      }
      // Do NOT auto-create a conversation — only create one when the user sends their first message.
    } finally {
      setLoading(false);
    }
  };

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: "Vocabulary Tutor", description: "Word mastery practice" },
    });
    setConversation(conv);
    setDeletedIds(loadDeleted(conv.id));
    setMessages(conv.messages || []);
    return conv;
  };

  const handleDeleteMessage = (id) => {
    setDeletedIds(prev => {
      const next = new Set(prev).add(id);
      persistDeleted(conversation?.id, next);
      return next;
    });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      const conv = await ensureConversation();
      await base44.agents.addMessage(conv, { role: "user", content: text });
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
          <MessageBubble
            key={m.id || i}
            message={m}
            onDelete={m.id ? () => handleDeleteMessage(m.id) : undefined}
          />
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
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Sparkles, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import MessageBubble from "@/components/tutor/MessageBubble";
import { useAppLang } from "@/hooks/useAppLang";
import { canUseAiToday, incrementAiUsage } from "@/lib/aiLimits";

const AGENT_NAME = "vocabulary_tutor";

export default function VocabTutorChat() {
  const { t, lang } = useAppLang();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [usage, setUsage] = useState({ limit: 0, used: 0, remaining: 0, unlimited: false, allowed: true });
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
      setMessages((data.messages || []).filter((m) => !deletedIds.has(m.id)));
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    try {
      const me = await base44.auth.me();
      let subs = await base44.entities.StudentSubscription.filter({ phone: me.email });
      if (subs.length === 0) subs = await base44.entities.StudentSubscription.filter({ created_by_id: me.id });
      const planName = subs?.[0]?.plan;
      const status = await canUseAiToday(planName, me.email, me.role === "admin");
      setUsage({ limit: status.limit, used: status.used, remaining: status.remaining, unlimited: status.unlimited, allowed: status.allowed });
      const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      const conv = existing?.[0];
      if (conv) {
        setConversation(conv);
        setDeletedIds(loadDeleted(conv.id));
        setMessages(conv.messages || []);
      }
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
    setMessages((prev) => (prev.length ? prev : conv.messages || []));
    return conv;
  };

  const handleDeleteMessage = (id) => {
    setDeletedIds((prev) => {
      const next = new Set(prev).add(id);
      persistDeleted(conversation?.id, next);
      return next;
    });
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  // Real gate is `allowed`, not `unlimited` — a display-unlimited plan (VIP)
  // can still hit its real fair-use ceiling underneath (see aiLimits.js).
  const limitReached = !usage.allowed;

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending || limitReached) return;
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, role: "user", content, _pending: true }]);
    setInput("");
    setSending(true);
    try {
      const conv = await ensureConversation();
      await base44.agents.addMessage(conv, { role: "user", content: `[${lang}] ${content}` });
      const me = await base44.auth.me();
      await incrementAiUsage(me.email, me.id, me.full_name);
      setUsage((u) => {
        const remaining = Math.max(0, u.remaining - 1);
        return { ...u, used: u.used + 1, remaining, allowed: remaining > 0 };
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
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
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">{t("tutor.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("tutor.sub")}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full select-none ${
          limitReached ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        }`}>
          {limitReached
            ? (usage.unlimited ? t("tutor.fair_use_badge") : t("tutor.uses_remaining", { used: usage.used, limit: usage.limit }))
            : (usage.unlimited ? t("tutor.unlimited") : t("tutor.uses_remaining", { used: usage.used, limit: usage.limit }))}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !limitReached && (
          <div className="text-center text-sm text-muted-foreground py-10 px-4">{t("tutor.empty")}</div>
        )}

        {limitReached ? (
          <div className="text-center py-10 px-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">
              {usage.unlimited ? t("tutor.fair_use_title") : t("tutor.limit_reached")}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              {usage.unlimited ? t("tutor.fair_use_desc") : t("tutor.limit_reached_desc", { limit: usage.limit })}
            </p>
            {!usage.unlimited && (
              <Link to="/pricing" className="inline-block">
                <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold select-none hover:bg-primary/90 transition-colors">
                  {t("tutor.upgrade")}
                </button>
              </Link>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id || i}
              message={m}
              onDelete={m.id ? () => handleDeleteMessage(m.id) : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!limitReached && (
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
      )}
    </div>
  );
}
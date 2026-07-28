import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatWindow({ user, roomId, partnerName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    base44.entities.ChatMessage.filter({ room_id: roomId }, "created_date", 100).then(setMessages);
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.room_id === roomId) {
        base44.entities.ChatMessage.filter({ room_id: roomId }, "created_date", 100).then(setMessages);
      }
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    const tempId = `temp_${Date.now()}`;
    // Optimistic: append immediately, reset input
    setMessages(prev => [...prev, {
      id: tempId,
      room_id: roomId,
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      sender_role: user.role,
      text: content,
      created_date: new Date().toISOString(),
      _pending: true,
    }]);
    setText("");
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        room_id: roomId,
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role,
        text: content,
      });
      // subscription refreshes; refetch as a fallback to swap the temp msg for the real one
      const fresh = await base44.entities.ChatMessage.filter({ room_id: roomId }, "created_date", 100);
      setMessages(fresh);
    } catch {
      // Rollback on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed bottom-0 right-0 left-0 z-50 flex flex-col bg-background border-t border-border shadow-2xl"
      style={{ maxHeight: "70vh", borderRadius: "1.25rem 1.25rem 0 0" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <p className="font-bold text-foreground text-sm">{partnerName}</p>
          <p className="text-xs text-muted-foreground">Chat</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground select-none">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-6">Xabarlar yo'q. Birinchi bo'lib yozing! 👋</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`select-text max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {!isMe && <p className="text-[10px] font-semibold opacity-70 mb-0.5">{msg.sender_name}</p>}
                <p className="text-sm leading-snug">{msg.text}</p>
                <p className={`text-[10px] mt-1 opacity-60 ${isMe ? "text-right" : ""}`}>
                  {msg.created_date ? new Date(msg.created_date).toLocaleTimeString().slice(0, 5) : ""}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Xabar yozing..."
          className="flex-1 h-10 px-4 border border-input rounded-full text-sm bg-muted text-foreground focus:border-primary focus:outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 flex-shrink-0 select-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
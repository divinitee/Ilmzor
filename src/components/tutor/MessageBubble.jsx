import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Trash2 } from "lucide-react";

export default function MessageBubble({ message, onDelete }) {
  const isUser = message.role === "user";
  const [confirming, setConfirming] = useState(false);

  const handleDelete = () => {
    if (!onDelete) return;
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    onDelete();
  };

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm relative ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
      {onDelete && (
        <button
          onClick={handleDelete}
          className={`self-end mb-1 ml-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 select-none ${
            confirming ? "opacity-100 bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-destructive"
          }`}
          aria-label="Delete message"
          title={confirming ? "Tap again to confirm" : "Delete"}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
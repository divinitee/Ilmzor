import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Send } from "lucide-react";

export default function TelegramPaymentLink() {
  const [botUsername, setBotUsername] = useState("");

  useEffect(() => {
    base44.functions
      .invoke("telegramPaymentBot", { action: "getBotInfo" })
      .then((res) => {
        const username = res?.data?.username;
        if (username) setBotUsername(username);
      })
      .catch(() => {});
  }, []);

  if (!botUsername) return null;

  return (
    <a
      href={`https://t.me/${botUsername}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#229ED9] hover:bg-[#1b8cc4] text-white text-sm font-semibold transition-colors select-none shadow-sm"
    >
      <Send className="w-4 h-4" />
      Send screenshot to Telegram bot
    </a>
  );
}
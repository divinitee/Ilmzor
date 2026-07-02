import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Check } from "lucide-react";
import ProfileEditor from "@/components/ProfileEditor";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      setNotificationsEnabled(me.notifications_enabled !== false);
    }).finally(() => setLoading(false));
  }, []);

  const reloadUser = async () => {
    const me = await base44.auth.me();
    setUser(me);
  };

  const handleToggleNotifications = async (checked) => {
    setNotificationsEnabled(checked);
    await base44.auth.updateMe({ notifications_enabled: checked });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background border-b border-border px-4 pb-3 flex items-center gap-3 safe-header sticky top-0 z-30">
        <Link to="/" className="text-muted-foreground hover:text-foreground p-1.5 select-none">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-foreground select-none">Hisob sozlamalari</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="bg-background rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Profil</p>
          <ProfileEditor user={user} onSaved={reloadUser} />
          <p className="text-sm text-muted-foreground mt-3 text-center">{user?.email}</p>
        </div>

        <div className="bg-background rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-4">Bildirishnomalar</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Email bildirishnomalari</p>
                <p className="text-xs text-muted-foreground">Obuna va yangiliklar haqida email olish</p>
              </div>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={handleToggleNotifications} />
          </div>
          {saved && (
            <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-3">
              <Check className="w-3.5 h-3.5" /> Saqlandi
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
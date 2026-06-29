import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2, Check, Pencil, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfileEditor({ user, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [roomCode, setRoomCode] = useState(user?.classroom_code || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: username, avatar_url: avatarUrl, classroom_code: roomCode.trim().toUpperCase() });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(user?.full_name || "");
    setAvatarUrl(user?.avatar_url || "");
    setRoomCode(user?.classroom_code || "");
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-border overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{(username || user?.email || "?")[0].toUpperCase()}</span>
            )}
          </div>
          {editing && (
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      {editing ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="username">Ism familiya</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ismingizni kiriting"
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roomcode">Sinf xona kodi</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="roomcode"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Masalan: ABC123"
                className="pl-10 h-11 font-mono uppercase tracking-widest"
                maxLength={10}
              />
            </div>
            <p className="text-xs text-muted-foreground">O'qituvchingiz bergan sinf kodini kiriting</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1 h-10 font-semibold select-none">
              Bekor qilish
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="flex-1 h-10 font-semibold select-none">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saqlanmoqda...</> : saved ? <><Check className="w-4 h-4 mr-2" />Saqlandi!</> : "Saqlash"}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-foreground">{username || "—"}</p>
          {roomCode ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              <Hash className="w-3 h-3" />
              <span className="font-mono font-medium">{roomCode}</span>
            </div>
          ) : null}
          <div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2 select-none">
              <Pencil className="w-3.5 h-3.5" />
              Tahrirlash
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
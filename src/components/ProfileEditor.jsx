import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Camera, Loader2, Check, Pencil, Hash, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLang } from "@/hooks/useAppLang";
import { resolveUserName } from "@/lib/profileName";
import { studentApi, joinErrorMessage } from "@/lib/serverApi";

export default function ProfileEditor({ user, onSaved }) {
  const { t, lang } = useAppLang();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(() => resolveUserName(user));
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [roomCode, setRoomCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  // Class-code problems get their own message: "couldn't save" would hide
  // the one thing the student can fix (a mistyped code, a removed class).
  const [codeError, setCodeError] = useState("");
  // The class code shown/compared is the student's REAL membership from the
  // server, not the User.classroom_code mirror: older accounts have typed
  // codes in the mirror that never linked to a class (e.g. "IDK"), and one
  // matching the right code while unlinked would otherwise never re-join.
  // null = couldn't load, fall back to the mirror.
  const [memberCode, setMemberCode] = useState(undefined);
  const effectiveCode = (memberCode ?? user?.classroom_code ?? "") || "";

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    studentApi("refresh")
      .then((r) => { if (!cancelled) setMemberCode(r?.membership && !r.membership.removed ? r.membership.code : ""); })
      .catch(() => { if (!cancelled) setMemberCode(null); });
    return () => { cancelled = true; };
  }, [user?.id, user?.classroom_code]);

  // `user` is refetched after every save (see Settings.jsx / Home.jsx's
  // onSaved handlers) and this component isn't remounted when that happens —
  // without this, a stale prop update while not editing would never reach
  // local state. Skipped while editing so it can't clobber an in-progress edit.
  useEffect(() => {
    if (editing) return;
    setUsername(resolveUserName(user));
    setAvatarUrl(user?.avatar_url || "");
    setRoomCode(effectiveCode);
  }, [user?.display_name, user?.full_name, user?.email, user?.avatar_url, effectiveCode, editing]);

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
    setError(false);
    setCodeError("");
    const trimmedName = username.trim();
    const nextCode = roomCode.trim().toUpperCase();
    const currentCode = effectiveCode.toUpperCase();
    try {
      // display_name, not full_name: the platform ignores writes to full_name
      // (see src/lib/profileName.js), which is why saving here used to revert
      // to "No name set" the moment the user was refetched.
      await base44.auth.updateMe({ display_name: trimmedName, avatar_url: avatarUrl });
      // The class code is a membership, not a profile string: changing it
      // joins (or leaves) a class server-side, which also moves the teacher
      // link. Writing User.classroom_code directly used to leave the roster
      // pointing at the old class.
      if (nextCode !== currentCode) {
        try {
          if (nextCode) await studentApi("joinClass", { code: nextCode });
          else await studentApi("leaveClass");
          setMemberCode(nextCode);
        } catch (joinErr) {
          setCodeError(joinErrorMessage(joinErr?.code, lang));
          setSaving(false);
          onSaved?.();
          return;
        }
      }
      setUsername(trimmedName);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(resolveUserName(user));
    setAvatarUrl(user?.avatar_url || "");
    setRoomCode(effectiveCode);
    setError(false);
    setCodeError("");
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
            <Label htmlFor="username">{t("profile.full_name")}</Label>
            <Input
              id="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t("profile.full_name_placeholder")}
              className="h-11"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roomcode">{t("profile.room_code")}</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="roomcode"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder={t("profile.room_code_placeholder")}
                className="pl-10 h-11 font-mono uppercase tracking-widest"
                maxLength={10}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("profile.room_code_desc")}</p>
            {codeError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {codeError}
              </p>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {t("profile.save_error")}
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1 h-10 font-semibold select-none">
              {t("profile.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="flex-1 h-10 font-semibold select-none">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("profile.saving")}</> : saved ? <><Check className="w-4 h-4 mr-2" />{t("profile.saved")}</> : t("profile.save")}
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-base font-semibold text-foreground">{username || t("profile.no_name")}</p>
          {roomCode ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              <Hash className="w-3 h-3" />
              <span className="font-mono font-medium">{roomCode}</span>
            </div>
          ) : null}
          <div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2 select-none">
              <Pencil className="w-3.5 h-3.5" />
              {t("profile.edit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
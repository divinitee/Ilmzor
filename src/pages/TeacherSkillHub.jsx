import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import SkillHub from "@/pages/SkillHub";
import { teacherApi } from "@/lib/serverApi";

export default function TeacherSkillHub() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await base44.auth.me();
        const allowed = me?.role === "admin" || me?.teacher_status === "approved";
        if (!allowed) return;
        // Groups + their active students come from teacherApi (server-scoped
        // to this teacher), so the assign dialog can target individuals.
        const data = await teacherApi("overview");
        if (data?.access !== "approved") return;
        const active = (data.students || []).filter((s) => s.roster_status === "active");
        const rows = (data.groups || [])
          .filter((g) => g.group_status !== "ended")
          .map((g) => ({ ...g, students: active.filter((s) => s.group_code === g.code) }));
        if (!cancelled) {
          setUser(me);
          setGroups(rows);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/teacher")}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Back to Teacher Panel"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="font-bold text-sm">Skill Hub assignments</div>
          <div className="text-[11px] text-muted-foreground">Choose a Skill Hub activity, then assign it to a group.</div>
        </div>
      </header>

      <SkillHub
        user={user}
        isActive
        assignmentMode
        assignmentGroups={groups}
      />
    </div>
  );
}
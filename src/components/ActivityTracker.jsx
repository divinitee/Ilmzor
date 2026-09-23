import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const MIN_SESSION_SECONDS = 10;

function labelForRoute(pathname) {
  if (pathname.startsWith("/skill-hub") || pathname.includes("skillhub")) return "Skill Hub";
  if (pathname.startsWith("/grammar")) return "Grammar";
  if (pathname.startsWith("/quiz")) return "Vocabulary quiz";
  if (pathname.startsWith("/lesson")) return "Lesson";
  if (pathname.startsWith("/my-progress")) return "My progress";
  if (pathname.startsWith("/vocab-review")) return "Vocabulary review";
  return pathname === "/" ? "Home" : "Learning activity";
}

// Records only time while the learner has a visible, focused tab. This is an
// engagement signal, not a billing-grade timer: client-side durations can be
// manipulated and must never gate access or payments.
export default function ActivityTracker({ user }) {
  const location = useLocation();
  const teacherIdRef = useRef(null);

  useEffect(() => {
    const isStudent = user && user.role !== "admin" && !user.teacher_status;
    if (!isStudent) return;

    let disposed = false;
    let activeStartedAt = Date.now();
    let activeSeconds = 0;
    let flushing = false;
    const route = `${location.pathname}${location.search}`;
    const activityLabel = labelForRoute(location.pathname);
    const sessionStartedAt = new Date().toISOString();

    base44.entities.StudentSubscription
      .filter({ phone: user.email }, "-created_date", 1)
      .then((rows) => {
        // A student their teacher removed from the roster stops sharing new
        // activity with that teacher (attribution itself is untouched).
        const row = rows?.[0];
        if (!disposed) teacherIdRef.current = row && row.roster_status !== "removed" ? row.teacher_id || null : null;
      })
      .catch(() => {});

    const isActive = () => document.visibilityState === "visible" && document.hasFocus();

    const pause = () => {
      if (!activeStartedAt) return;
      activeSeconds += (Date.now() - activeStartedAt) / 1000;
      activeStartedAt = null;
    };

    const resume = () => {
      if (!activeStartedAt && isActive()) activeStartedAt = Date.now();
    };

    const flush = async () => {
      if (flushing) return;
      pause();
      const durationSeconds = Math.round(activeSeconds);
      if (durationSeconds < MIN_SESSION_SECONDS) {
        resume();
        return;
      }

      flushing = true;
      const endedAt = new Date().toISOString();
      activeSeconds = 0;
      try {
        await base44.entities.ActivitySession.create({
          student_email: user.email,
          ...(teacherIdRef.current ? { teacher_id: teacherIdRef.current } : {}),
          route,
          activity_label: activityLabel,
          started_at: sessionStartedAt,
          ended_at: endedAt,
          duration_seconds: durationSeconds,
        });
      } catch (error) {
        console.error("Activity session save failed:", error);
      } finally {
        flushing = false;
        resume();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
      else resume();
    };
    const interval = window.setInterval(flush, 60000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", resume);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", flush);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", resume);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [user?.id, user?.email, user?.role, user?.teacher_status, location.pathname, location.search]);

  return null;
}
